
import { app, safeStorage } from 'electron';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_FILE = 'provider-keys.enc';

function getStoragePath() {
  return path.join(app.getPath('userData'), STORAGE_FILE);
}

async function readEncryptedKeys() {
  const filePath = getStoragePath();

  try {
    const encrypted = await readFile(filePath);

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        'Secure storage is unavailable. API keys cannot be accessed safely.'
      );
    }

    const decrypted = safeStorage.decryptString(encrypted);
    const parsed = JSON.parse(decrypted);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('The secure API-key storage file is invalid.');
    }

    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

async function writeEncryptedKeys(keys) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'Secure storage is unavailable. API keys were not saved.'
    );
  }

  const directory = app.getPath('userData');
  await mkdir(directory, { recursive: true });

  const encrypted = safeStorage.encryptString(JSON.stringify(keys));

  await writeFile(getStoragePath(), encrypted, {
    mode: 0o600,
  });
}

export async function getProviderKeyStatus() {
  const keys = await readEncryptedKeys();

  return {
    openai: Boolean(keys.openai),
    gemini: Boolean(keys.gemini),
    anthropic: Boolean(keys.anthropic),
  };
}

export async function saveProviderKey(provider, apiKey) {
  const allowedProviders = ['openai', 'gemini', 'anthropic'];

  if (!allowedProviders.includes(provider)) {
    throw new Error('Unsupported AI provider.');
  }

  if (typeof apiKey !== 'string') {
    throw new Error('API key must be text.');
  }

  const normalizedKey = apiKey.trim();

  if (!normalizedKey || normalizedKey.length > 2048) {
    throw new Error('Enter a valid API key.');
  }

  const keys = await readEncryptedKeys();
  keys[provider] = normalizedKey;

  await writeEncryptedKeys(keys);

  return getProviderKeyStatus();
}

export async function deleteProviderKey(provider) {
  const allowedProviders = ['openai', 'gemini', 'anthropic'];

  if (!allowedProviders.includes(provider)) {
    throw new Error('Unsupported AI provider.');
  }

  const keys = await readEncryptedKeys();
  delete keys[provider];

  if (Object.keys(keys).length === 0) {
    const { unlink } = await import('node:fs/promises');

    try {
      await unlink(getStoragePath());
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    return getProviderKeyStatus();
  }

  await writeEncryptedKeys(keys);

  return getProviderKeyStatus();
}

export async function getProviderKey(provider) {
  const allowedProviders = ['openai', 'gemini', 'anthropic'];

  if (!allowedProviders.includes(provider)) {
    throw new Error('Unsupported AI provider.');
  }

  const keys = await readEncryptedKeys();
  return keys[provider] || null;
}
