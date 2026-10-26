import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getProviderKeyStatus,
  saveProviderKey,
  deleteProviderKey,
  getProviderKey,
} from './secureKeys.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* PROJECT FOLDER ACCESS */

let selectedProjectRoot = null;

const MAX_PROJECT_FILE_SIZE = 1024 * 1024; // 1 MB

const BLOCKED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
]);

function isBlockedProjectFile(relativePath) {
  const segments = relativePath
    .split(path.sep)
    .filter(Boolean);

  if (segments.some((segment) => BLOCKED_DIRECTORIES.has(segment))) {
    return true;
  }

  const fileName = path.basename(relativePath).toLowerCase();

  // Block environment files and common secret/key files.
  if (
    fileName === '.env' ||
    fileName.startsWith('.env.') ||
    fileName.endsWith('.pem') ||
    fileName.endsWith('.key') ||
    fileName.endsWith('.p12') ||
    fileName.endsWith('.pfx') ||
    fileName === 'id_rsa' ||
    fileName === 'id_ed25519' ||
    fileName.includes('secret') ||
    fileName.includes('credentials')
  ) {
    return true;
  }

  return false;
}

function getSafeProjectPath(filePath) {
  if (
    !selectedProjectRoot ||
    typeof filePath !== 'string' ||
    !filePath.trim()
  ) {
    throw new Error('Select a project folder first.');
  }

  const absolutePath = path.resolve(selectedProjectRoot, filePath);
  const relativePath = path.relative(
    selectedProjectRoot,
    absolutePath
  );

  // Reject paths outside the selected project.
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error('Access outside the selected project is not allowed.');
  }

  if (!relativePath || isBlockedProjectFile(relativePath)) {
    throw new Error('This project path is blocked.');
  }

  return { absolutePath, relativePath };
}

// Open a native folder picker.
ipcMain.handle('project:select-folder', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select a project folder',
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const chosenPath = result.filePaths[0];
  const realPath = await fs.realpath(chosenPath);
  const stats = await fs.stat(realPath);

  if (!stats.isDirectory()) {
    throw new Error('Please select a valid project folder.');
  }

  selectedProjectRoot = realPath;

  return {
    canceled: false,
    name: path.basename(realPath),
    path: realPath,
  };
});

// Read a text file from the selected project only.
ipcMain.handle('project:read-file', async (_event, payload) => {
  const { absolutePath, relativePath } = getSafeProjectPath(
    payload?.filePath
  );

  // Resolve symlinks to prevent escaping the selected folder.
  const realPath = await fs.realpath(absolutePath);
  const realRoot = await fs.realpath(selectedProjectRoot);
  const realRelativePath = path.relative(realRoot, realPath);

  if (
    realRelativePath === '..' ||
    realRelativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(realRelativePath)
  ) {
    throw new Error('Access through a project symlink is not allowed.');
  }

  if (isBlockedProjectFile(realRelativePath)) {
    throw new Error('Reading this file is not allowed.');
  }

  const stats = await fs.stat(realPath);

  if (!stats.isFile()) {
    throw new Error('The requested path is not a file.');
  }

  if (stats.size > MAX_PROJECT_FILE_SIZE) {
    throw new Error('File is larger than 1 MB. Select a smaller file.');
  }

  const content = await fs.readFile(realPath, 'utf8');

  // Reject likely binary content.
  if (content.includes('\0')) {
    throw new Error('Binary files cannot be read as text.');
  }

  return {
    path: relativePath,
    content,
    size: stats.size,
  };
});

const OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_LOCAL_MODEL = 'qwen2.5-coder:3b';
const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 20000;
const MAX_RESPONSE_TOKENS = 512;

const PROVIDERS = {
  openai: {
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
  gemini: {
    model: 'gemini-2.5-flash',
    endpoint:
      'https://generativelanguage.googleapis.com/v1beta/models/',
  },
  anthropic: {
    model: 'claude-3-5-haiku-20241022',
    endpoint: 'https://api.anthropic.com/v1/messages',
  },
};

// Coding instructions for the local AI model.
const LOCAL_SYSTEM_PROMPT = [
  'You are Laxman Coding AI, a practical software engineering assistant.',
  'Help with JavaScript, React, Node.js, Express, MongoDB, APIs, debugging, testing, and deployment.',
  'Explain the cause of errors before suggesting fixes.',
  'Provide correct, runnable code and identify the filename when relevant.',
  'Respect the user’s existing project structure, libraries, CSS conventions, and architecture.',
  'Do not invent files, APIs, dependencies, or test results.',
  'When information is missing, state your assumptions or ask a focused question.',
  'Prefer secure, maintainable solutions and explain important trade-offs briefly.',
  'Never claim you executed or tested code unless you actually did.',
  'Keep answers clear, practical, and appropriately concise.',
].join('\n');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 680,
    title: 'Laxman Coding AI',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    win.loadURL('http://127.0.0.1:5173');
  }
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Please enter a message before sending.');
  }

  return messages.slice(-MAX_MESSAGES).map((message) => {
    if (
      !message ||
      !['system', 'user', 'assistant'].includes(message.role)
    ) {
      throw new Error('Invalid message role.');
    }

    if (typeof message.content !== 'string') {
      throw new Error('Message content must be text.');
    }

    return {
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_LENGTH),
    };
  });
}

function validateProvider(provider) {
  if (!Object.hasOwn(PROVIDERS, provider)) {
    throw new Error('Unsupported AI provider.');
  }

  return provider;
}

async function readError(response, provider) {
  const detail = await response.text();

  let message = `The ${provider} request failed (HTTP ${response.status}).`;

  try {
    const parsed = JSON.parse(detail);
    const providerMessage =
      parsed.error?.message ||
      parsed.error?.status ||
      parsed.message;

    if (typeof providerMessage === 'string') {
      message += ` ${providerMessage.slice(0, 400)}`;
    }
  } catch {
    // Keep the generic error if the response is not JSON.
  }

  if (response.status === 401 || response.status === 403) {
    message += ' Check your API key and provider permissions.';
  } else if (response.status === 429) {
    message += ' Check your usage limits and billing.';
  }

  throw new Error(message);
}

// OPENAI CLOUD CHAT
async function requestOpenAI(apiKey, messages) {
  const response = await fetch(PROVIDERS.openai.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: PROVIDERS.openai.model,
      messages,
      max_tokens: MAX_RESPONSE_TOKENS,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    await readError(response, 'OpenAI');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI returned an empty response.');
  }

  return {
    content,
    model: data.model || PROVIDERS.openai.model,
    provider: 'openai',
  };
}

// GOOGLE GEMINI CLOUD CHAT
async function requestGemini(apiKey, messages) {
  const systemMessages = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content);

  const conversation = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

  if (conversation.length === 0) {
    throw new Error('Please provide a user message for Gemini.');
  }

  const model = PROVIDERS.gemini.model;

  const response = await fetch(
    `${PROVIDERS.gemini.endpoint}${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        ...(systemMessages.length
          ? {
              systemInstruction: {
                parts: [{ text: systemMessages.join('\n\n') }],
              },
            }
          : {}),
        contents: conversation,
        generationConfig: {
          maxOutputTokens: MAX_RESPONSE_TOKENS,
        },
      }),
      signal: AbortSignal.timeout(120000),
    }
  );

  if (!response.ok) {
    await readError(response, 'Gemini');
  }

  const data = await response.json();
  const content = (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('');

  if (!content.trim()) {
    throw new Error(
      'Gemini returned no text. The response may have been blocked or stopped.'
    );
  }

  return {
    content,
    model,
    provider: 'gemini',
  };
}

// ANTHROPIC CLAUDE CLOUD CHAT
async function requestAnthropic(apiKey, messages) {
  const systemMessages = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content);

  const conversation = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }));

  if (conversation.length === 0) {
    throw new Error('Please provide a user message for Claude.');
  }

  const response = await fetch(PROVIDERS.anthropic.endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: PROVIDERS.anthropic.model,
      max_tokens: MAX_RESPONSE_TOKENS,
      ...(systemMessages.length
        ? { system: systemMessages.join('\n\n') }
        : {}),
      messages: conversation,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    await readError(response, 'Anthropic Claude');
  }

  const data = await response.json();
  const content = (data.content || [])
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('');

  if (!content.trim()) {
    throw new Error('Claude returned an empty response.');
  }

  return {
    content,
    model: data.model || PROVIDERS.anthropic.model,
    provider: 'anthropic',
  };
}

// LOCAL OLLAMA STATUS
ipcMain.handle('ai:status', async () => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        connected: false,
        models: [],
        error: `Ollama returned HTTP ${response.status}.`,
      };
    }

    const data = await response.json();

    return {
      connected: true,
      models: (data.models || []).map((item) => item.name),
    };
  } catch {
    return {
      connected: false,
      models: [],
      error: 'Cannot connect to Ollama. Make sure Ollama is running.',
    };
  }
});

// LOCAL OLLAMA CHAT
ipcMain.handle('ai:chat', async (_event, payload) => {
  const messages = validateMessages(payload?.messages);

  const selectedModel =
    typeof payload?.model === 'string' && payload.model.trim()
      ? payload.model.trim()
      : DEFAULT_LOCAL_MODEL;

  // Prevent attempts to use a model that is not installed locally.
  const tagsResponse = await fetch(`${OLLAMA_URL}/api/tags`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!tagsResponse.ok) {
    throw new Error('Cannot retrieve installed Ollama models.');
  }

  const tagsData = await tagsResponse.json();
  const installedModels = (tagsData.models || []).map(
    (item) => item.name
  );

  if (!installedModels.includes(selectedModel)) {
    throw new Error(
      `The model "${selectedModel}" is not installed. Open Workspace Settings and select an installed model.`
    );
  }

  // Always apply our coding prompt and ignore any system prompt
  // supplied by the renderer, while preserving the conversation.
  const conversation = [
    {
      role: 'system',
      content: LOCAL_SYSTEM_PROMPT,
    },
    ...messages.filter((message) => message.role !== 'system'),
  ];

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: selectedModel,
      messages: conversation,
      stream: false,
      options: {
  num_predict: 256,
  temperature: 0.3,
  num_ctx: 2048,
},
keep_alive: '10m',
    }),
    signal: AbortSignal.timeout(180000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Ollama request failed (${response.status}): ${detail.slice(0, 400)}`
    );
  }

  const data = await response.json();
  const content = data.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('The local model returned an empty response.');
  }

  return {
    content,
    model: data.model || selectedModel,
    provider: 'ollama',
  };
});

// ENCRYPTED PROVIDER KEY MANAGEMENT
ipcMain.handle('providers:key-status', async () => {
  return getProviderKeyStatus();
});

ipcMain.handle('providers:save-key', async (_event, payload) => {
  const provider = validateProvider(payload?.provider);
  return saveProviderKey(provider, payload?.apiKey);
});

ipcMain.handle('providers:delete-key', async (_event, payload) => {
  const provider = validateProvider(payload?.provider);
  return deleteProviderKey(provider);
});

ipcMain.handle('providers:has-key', async (_event, payload) => {
  const provider = validateProvider(payload?.provider);
  const key = await getProviderKey(provider);

  return { configured: Boolean(key) };
});

// ONLINE CLOUD CHAT
ipcMain.handle('ai:online-chat', async (_event, payload) => {
  const provider = validateProvider(payload?.provider);
  const messages = validateMessages(payload?.messages);
  const apiKey = await getProviderKey(provider);

  if (!apiKey) {
    throw new Error(
      `No API key is configured for ${provider}. Open provider settings first.`
    );
  }

  try {
    switch (provider) {
      case 'openai':
        return await requestOpenAI(apiKey, messages);

      case 'gemini':
        return await requestGemini(apiKey, messages);

      case 'anthropic':
        return await requestAnthropic(apiKey, messages);

      default:
        throw new Error('Unsupported AI provider.');
    }
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      throw new Error(
        `${provider} took too long to respond. Please try again.`
      );
    }

    throw error;
  }
});

// ELECTRON LIFECYCLE
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});