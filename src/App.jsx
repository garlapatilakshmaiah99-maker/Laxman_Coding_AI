
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity, ArrowDown, ArrowUp, Bot, Check, ChevronDown, Code2, Command,
  FileCode2, FolderKanban, Globe2, History, Laptop, Menu, MessageSquare,
  MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Sparkles, Square,
  WifiOff, X, Zap, Trash2, Save, Eye, EyeOff
} from 'lucide-react';
import './App.css';

const MODEL = 'qwen2.5-coder:3b';

const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    description: 'OpenAI cloud models',
    placeholder: 'Enter your OpenAI API key',
    help: 'Create an API key in the OpenAI developer platform.',
  },
  gemini: {
    label: 'Google Gemini',
    description: 'Google cloud models',
    placeholder: 'Enter your Gemini API key',
    help: 'Create an API key in Google AI Studio.',
  },
  anthropic: {
    label: 'Anthropic Claude',
    description: 'Claude cloud models',
    placeholder: 'Enter your Anthropic API key',
    help: 'Create an API key in the Anthropic Console.',
  },
};

const starters = [
  {
    icon: Code2,
    title: 'Build a React component',
    text: 'Create a reusable React component with normal CSS.',
  },
  {
    icon: FileCode2,
    title: 'Debug an error',
    text: 'Help me investigate a JavaScript or Node.js error.',
  },
  {
    icon: FolderKanban,
    title: 'Plan a full-stack app',
    text: 'Design a practical MERN application architecture.',
  },
  {
    icon: ShieldCheck,
    title: 'Review my code securely',
    text: 'Review code for correctness, security, and maintainability.',
  },
];

function App() {
  const [mode, setMode] = useState(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ connected: false, models: [] });
  const [error, setError] = useState('');
  const [model, setModel] = useState(MODEL);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
const [projectFilePath, setProjectFilePath] = useState('');
const [projectFileContent, setProjectFileContent] = useState('');
const [projectLoading, setProjectLoading] = useState(false);
const [projectError, setProjectError] = useState('');

  const [provider, setProvider] = useState('openai');
  const [providerStatus, setProviderStatus] = useState({
    openai: false,
    gemini: false,
    anthropic: false,
  });
  const [providerKeyDraft, setProviderKeyDraft] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [deletingKey, setDeletingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');

  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

async function chooseProjectFolder() {
  setProjectError('');
  setProjectFileContent('');

  try {
    if (!window.laxmanAI?.selectProjectFolder) {
      throw new Error('Project access is unavailable. Restart the app.');
    }

    const result = await window.laxmanAI.selectProjectFolder();

    if (result.canceled) return;

    setSelectedProject(result);
    setProjectFilePath('');
    setProjectFileContent('');
  } catch (err) {
    setProjectError(err?.message || 'Could not select project folder.');
  }
}

async function readSelectedProjectFile() {
  const relativePath = projectFilePath.trim();

  if (!selectedProject) {
    setProjectError('Select a project folder first.');
    return;
  }

  if (!relativePath) {
    setProjectError('Enter a relative file path, such as src/App.jsx.');
    return;
  }

  setProjectLoading(true);
  setProjectError('');
  setProjectFileContent('');

  try {
    if (!window.laxmanAI?.readProjectFile) {
      throw new Error('File reading is unavailable. Restart the app.');
    }

    const result = await window.laxmanAI.readProjectFile(relativePath);
    setProjectFileContent(result.content);
  } catch (err) {
    setProjectError(err?.message || 'Could not read project file.');
  } finally {
    setProjectLoading(false);
  }
}

  async function refreshLocalStatus() {
    if (!window.laxmanAI?.getStatus) return;

    try {
      const result = await window.laxmanAI.getStatus();
      setStatus(result);
    } catch {
      setStatus({ connected: false, models: [] });
    }
  }

  async function refreshProviderStatus() {
    if (!window.laxmanAI?.getProviderKeyStatus) return;

    try {
      const result = await window.laxmanAI.getProviderKeyStatus();
      setProviderStatus(result);
    } catch {
      setSettingsError(
        'Unable to read provider configuration. Restart the desktop app and try again.'
      );
    }
  }

  useEffect(() => {
    refreshLocalStatus();
    refreshProviderStatus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [mode]);

  const filteredHistory = useMemo(
    () =>
      history.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      ),
    [history, search]
  );

  function newChat() {
    setMessages([]);
    setError('');
    setDraft('');
  }

  async function sendMessage(text = draft) {
    const content = text.trim();

    if (!content || loading) return;

    if (!mode) {
      setError('Choose Offline Mode or Online Mode first.');
      return;
    }

    if (!window.laxmanAI) {
      setError(
        'Browser version is not connected to an AI service yet. The desktop version uses your local Ollama model.'
      );
      return;
    }

    if (mode === 'offline' && !window.laxmanAI.chat) {
      setError('The local Ollama connection is not available.');
      return;
    }

    if (mode === 'online' && !window.laxmanAI.onlineChat) {
      setError(
        'Online chat is not available. Restart the desktop application.'
      );
      return;
    }

    if (mode === 'online' && !providerStatus[provider]) {
      setError(
        `Configure your ${PROVIDERS[provider].label} API key in Workspace Settings first.`
      );
      setShowSettings(true);
      return;
    }

    const next = [
      ...messages,
      { role: 'user', content, id: crypto.randomUUID() },
    ];

    setMessages(next);
    setDraft('');
    setError('');
    setLoading(true);

    try {
      const conversation = next.map(({ role, content: body }) => ({
        role,
        content: body,
      }));

      let result;

      if (mode === 'offline') {
        result = await window.laxmanAI.chat({
          messages: conversation,
          model,
        });
      } else {
        result = await window.laxmanAI.onlineChat({
          provider,
          messages: conversation,
        });
      }

      const answer = {
        role: 'assistant',
        content: result.content,
        id: crypto.randomUUID(),
        provider: result.provider || (mode === 'offline' ? 'ollama' : provider),
      };

      const completeConversation = [...next, answer];

      setMessages(completeConversation);

      setHistory((current) => [
        {
          id: next[0].id,
          title: content.slice(0, 54),
          messages: completeConversation,
        },
        ...current.filter((item) => item.id !== next[0].id),
      ]);
    } catch (err) {
      setError(err?.message || 'The AI request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function saveKey() {
    const key = providerKeyDraft.trim();

    if (!key) {
      setSettingsError('Enter an API key first.');
      return;
    }

    if (!window.laxmanAI?.saveProviderKey) {
      setSettingsError('Secure key storage is unavailable. Restart the app.');
      return;
    }

    setSavingKey(true);
    setSettingsError('');
    setSettingsMessage('');

    try {
      const updated = await window.laxmanAI.saveProviderKey(provider, key);

      setProviderStatus(updated);
      setProviderKeyDraft('');
      setShowKey(false);
      setSettingsMessage(`${PROVIDERS[provider].label} API key saved securely.`);
    } catch (err) {
      setSettingsError(err?.message || 'Could not save the API key.');
    } finally {
      setSavingKey(false);
    }
  }

  async function deleteKey() {
    if (!providerStatus[provider]) {
      setSettingsError('No saved API key exists for this provider.');
      return;
    }

    const confirmed = window.confirm(
      `Remove the saved ${PROVIDERS[provider].label} API key?`
    );

    if (!confirmed) return;

    setDeletingKey(true);
    setSettingsError('');
    setSettingsMessage('');

    try {
      const updated = await window.laxmanAI.deleteProviderKey(provider);

      setProviderStatus(updated);
      setProviderKeyDraft('');
      setSettingsMessage(`${PROVIDERS[provider].label} API key removed.`);
    } catch (err) {
      setSettingsError(err?.message || 'Could not delete the API key.');
    } finally {
      setDeletingKey(false);
    }
  }

  function openSettings() {
    setSettingsError('');
    setSettingsMessage('');
    setShowSettings(true);
    refreshProviderStatus();
  }

  function openHistory(item) {
    setMessages(item.messages);
    setError('');
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  if (!mode) {
    return (
      <div className="mode-screen">
        <div className="mode-glow" />

        <div className="mode-brand">
          <div className="brand-mark"><Code2 size={25} /></div>
          <span>LAXMAN <b>CODING AI</b></span>
        </div>

        <div className="mode-content">
          <div className="eyebrow">
            <Sparkles size={14} /> YOUR PERSONAL ENGINEERING PARTNER
          </div>

          <h1>Build. Debug.<br /><span>Learn. Ship.</span></h1>

          <p className="mode-lede">
            Choose how you want to work. You can change modes later.
          </p>

          <div className="mode-cards">
            <button
              className="mode-card offline-card"
              onClick={() => setMode('offline')}
            >
              <div className="mode-card-icon green"><WifiOff size={22} /></div>
              <div className="mode-card-copy">
                <strong>Offline Mode</strong>
                <span>Runs on your computer. No internet needed after setup.</span>
                <small><i className="status-dot" /> LOCAL MODEL Â· OLLAMA</small>
              </div>
              <ArrowUp className="mode-arrow" size={18} />
            </button>

            <button
              className="mode-card online-card"
              onClick={() => setMode('online')}
            >
              <div className="mode-card-icon blue"><Globe2 size={22} /></div>
              <div className="mode-card-copy">
                <strong>Online Mode</strong>
                <span>Use OpenAI, Gemini, or Claude cloud models.</span>
                <small><Zap size={12} /> CLOUD PROVIDER REQUIRED</small>
              </div>
              <ArrowUp className="mode-arrow" size={18} />
            </button>
          </div>

          <div className="privacy-note">
            <ShieldCheck size={15} />
            Offline prompts stay on your computer. Online prompts are sent to
            the selected cloud provider.
          </div>
        </div>

        <div className="mode-footer">
          PERSONAL AI WORKSPACE <span>â€¢</span> WINDOWS DESKTOP
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand-mark small"><Code2 size={19} /></div>
            <div className="brand-name">
              Laxman <b>Coding AI</b>
              <small>LOCAL ENGINEERING WORKSPACE</small>
            </div>
            <button
              className="icon-button close-sidebar"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <button className="new-chat" onClick={newChat}>
            <Plus size={17} /> New chat <span>Ctrl K</span>
          </button>

          <div className="sidebar-nav">
            <button className="nav-item active">
              <MessageSquare size={16} /> Chat
            </button>
            <button className="nav-item" onClick={openSettings}>
              <FolderKanban size={16} /> Projects <span className="soon">SOON</span>
            </button>
            <button className="nav-item" onClick={openSettings}>
              <Code2 size={16} /> Code assistant
            </button>
            <button className="nav-item" onClick={openSettings}>
              <History size={16} /> Learning workspace
            </button>
          </div>

          <div className="history-heading">
            <span>RECENT CONVERSATIONS</span><Search size={14} />
          </div>

          <div className="history-search">
            <Search size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
            />
          </div>

          <div className="history-list">
            {filteredHistory.map((item) => (
              <button
                key={item.id}
                className="history-item"
                onClick={() => openHistory(item)}
              >
                <MessageSquare size={14} />
                <span>{item.title}</span>
                <MoreHorizontal size={15} />
              </button>
            ))}

            {filteredHistory.length === 0 && (
              <div className="history-empty">
                Your conversations will appear here.
              </div>
            )}
          </div>

          <div className="sidebar-bottom">
            <div className="local-status">
              <span className={status.connected ? 'status-dot' : 'status-dot offline'} />
              <div>
                <strong>
                  {status.connected ? 'Local AI connected' : 'Local AI not detected'}
                </strong>
                <small>
                  {status.connected
                    ? (status.models.includes(model)
                        ? model
                        : `${status.models.length} model(s) available`)
                    : 'Check that Ollama is running'}
                </small>
              </div>
              <Activity size={15} />
            </div>

            <button className="profile-button" onClick={openSettings}>
              <div className="avatar">L</div>
              <div><strong>Laxman</strong><small>Personal workspace</small></div>
              <Settings2 size={17} />
            </button>
          </div>
        </aside>
      )}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <button
                className="icon-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu size={18} />
              </button>
            )}

            <div className="workspace-label">
              <span className="workspace-dot" />
              <strong>AI Workspace</strong>
              <span className="slash">/</span>
              <span>Chat</span>
            </div>
          </div>

          <div className="topbar-right">
            <button className="mode-pill" onClick={() => setMode(null)}>
              <span className={mode === 'offline' ? 'status-dot' : 'status-dot blue-dot'} />
              {mode === 'offline' ? 'Offline Mode' : 'Online Mode'}
              <ChevronDown size={14} />
            </button>

            <button
              className="icon-button"
              aria-label="Settings"
              onClick={openSettings}
            >
              <Settings2 size={17} />
            </button>
          </div>
        </header>

<section
  style={{
    padding: '16px 24px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
  }}
>
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
    }}
  >
    <button
      className="new-chat"
      onClick={chooseProjectFolder}
      disabled={projectLoading}
    >
      <FolderKanban size={16} />
      Select project folder
    </button>

    {selectedProject && (
      <span style={{ fontSize: '13px', overflowWrap: 'anywhere' }}>
        Project: <strong>{selectedProject.name}</strong>
      </span>
    )}
  </div>

  {selectedProject && (
    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
      <input
        value={projectFilePath}
        onChange={(e) => setProjectFilePath(e.target.value)}
        placeholder="Relative path, e.g. src/App.jsx"
        aria-label="Project file path"
        style={{
          flex: 1,
          minWidth: 0,
          padding: '10px 12px',
          borderRadius: '8px',
        }}
      />

      <button
        className="new-chat"
        onClick={readSelectedProjectFile}
        disabled={projectLoading}
      >
        {projectLoading ? 'Reading...' : 'Read file'}
      </button>
    </div>
  )}

  {projectError && (
    <p role="alert" style={{ color: '#f87171', fontSize: '13px' }}>
      {projectError}
    </p>
  )}

  {projectFileContent && (
    <div style={{ marginTop: '12px' }}>
      <strong>File preview: {projectFilePath}</strong>
      <pre
        style={{
          maxHeight: '260px',
          overflow: 'auto',
          padding: '12px',
          borderRadius: '8px',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          fontSize: '12px',
        }}
      >
        {projectFileContent}
      </pre>
    </div>
  )}
</section>


        {mode === 'online' && (
          <div className="online-provider-bar">
            <label htmlFor="online-provider">Cloud provider</label>
            <select
              id="online-provider"
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setError('');
              }}
            >
              {Object.entries(PROVIDERS).map(([key, item]) => (
                <option key={key} value={key}>{item.label}</option>
              ))}
            </select>

            <span className={`connection-badge ${providerStatus[provider] ? 'ok' : ''}`}>
              {providerStatus[provider] ? 'Key configured' : 'Setup required'}
            </span>

            <button className="icon-button" onClick={openSettings}>
              <Settings2 size={16} /> Configure
            </button>
          </div>
        )}

        <section className={`conversation ${messages.length ? 'has-messages' : ''}`}>
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-symbol">
                <Code2 size={26} /><span />
              </div>

              <div className="welcome-label">
                <span className="status-dot" />
                {mode === 'offline' ? 'READY TO BUILD LOCALLY' : 'ONLINE AI WORKSPACE'}
              </div>

              <h2>Your engineering<br /><span>co-pilot.</span></h2>
              <p>What are we building or solving today?</p>

              <div className="starter-grid">
                {starters.map(({ icon: Icon, title, text }) => (
                  <button
                    className="starter-card"
                    key={title}
                    onClick={() => sendMessage(text)}
                  >
                    <div><Icon size={17} /><ArrowDown size={14} /></div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </button>
                ))}
              </div>

              <div className="local-model-line">
                {mode === 'offline' ? <Laptop size={15} /> : <Globe2 size={15} />}
                <span>{mode === 'offline' ? 'Running locally with' : 'Using cloud provider'}</span>
                <strong>{mode === 'offline' ? model : PROVIDERS[provider].label}</strong>
                {mode === 'offline' && (
  <span className="model-chip">
    {model.includes(':3b') ? '3B' : model.includes(':1.5b') ? '1.5B' : 'Local Model'}
  </span>
)}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="message-avatar">
                    {message.role === 'assistant' ? <Code2 size={16} /> : 'L'}
                  </div>

                  <div className="message-body">
                    <div className="message-author">
                      {message.role === 'assistant' ? 'Laxman Coding AI' : 'You'}
                      {message.role === 'assistant' && (
                        <span>
                          {' Â· '}
                          {message.provider === 'ollama'
                            ? 'LOCAL MODEL'
                            : PROVIDERS[message.provider]?.label || 'CLOUD MODEL'}
                        </span>
                      )}
                    </div>

                    {message.role === 'assistant' ? (
                      <div className="markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="user-message-text">{message.content}</p>
                    )}

                    {message.role === 'assistant' && (
                      <button
                        className="copy-answer"
                        onClick={() => copyText(message.content)}
                      >
                        <Check size={13} /> Copy response
                      </button>
                    )}
                  </div>
                </article>
              ))}

              {loading && (
                <article className="message assistant">
                  <div className="message-avatar"><Code2 size={16} /></div>
                  <div className="message-body">
                    <div className="message-author">
                      Laxman Coding AI
                      <span>
                        {mode === 'offline' ? ' Â· THINKING LOCALLY' : ` Â· CONTACTING ${PROVIDERS[provider].label.toUpperCase()}`}
                      </span>
                    </div>
                    <div className="typing"><i /><i /><i /></div>
                  </div>
                </article>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <div className="composer-wrap">
          <div className="composer-hint">
            <span><Command size={12} /> Enter to send</span>
            <span>Shift + Enter for new line</span>
          </div>

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                mode === 'offline'
                  ? 'Ask anything about code, architecture, or debuggingâ€¦'
                  : `Ask ${PROVIDERS[provider].label} about code, architecture, or debuggingâ€¦`
              }
              rows={2}
            />

            <div className="composer-actions">
              <div className="composer-tools">
                <span className="model-select">
                  <Bot size={14} />
                  {mode === 'offline' ? model : PROVIDERS[provider].label}
                  <ChevronDown size={13} />
                </span>
                <span className="secure-label">
                  <ShieldCheck size={13} />
                  {mode === 'offline' ? 'Local' : 'Cloud'}
                </span>
              </div>

              <button
                className="send-button"
                type="submit"
                disabled={!draft.trim() || loading}
                aria-label="Send message"
              >
                {loading ? <Square size={15} /> : <ArrowUp size={18} />}
              </button>
            </div>
          </form>

          <div className="composer-disclaimer">
            AI can make mistakes. Verify important code and security decisions.
            {mode === 'online' && ' Online prompts are sent to your selected provider.'}
          </div>

          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button onClick={() => setError('')} aria-label="Dismiss error">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </main>

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <section
            className="settings-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">PREFERENCES</span>
                <h3>Workspace settings</h3>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowSettings(false)}
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </div>

            <div className="setting-row">
              <div>
                <strong>Connection</strong>
                <p>
                  {status.connected
                    ? 'Ollama is reachable on this computer.'
                    : 'Ollama is not currently reachable.'}
                </p>
              </div>
              <span className={`connection-badge ${status.connected ? 'ok' : ''}`}>
                {status.connected ? 'Connected' : 'Offline'}
              </span>
            </div>

            <div className="setting-row">
              <div>
                <strong>Local model</strong>
                <p>Model tag used for Offline Mode.</p>
              </div>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {[...new Set([MODEL, ...status.models])].map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="provider-settings">
              <h4>Online AI providers</h4>
              <p className="settings-description">
                Keys are saved using Electron secure storage. The UI never
                receives a previously stored key.
              </p>

              <label htmlFor="provider-select">Provider</label>
              <select
                id="provider-select"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setProviderKeyDraft('');
                  setShowKey(false);
                  setSettingsError('');
                  setSettingsMessage('');
                }}
              >
                {Object.entries(PROVIDERS).map(([key, item]) => (
                  <option key={key} value={key}>{item.label}</option>
                ))}
              </select>

              <p className="provider-help">{PROVIDERS[provider].help}</p>

              <label htmlFor="provider-key">API key</label>
              <div className="api-key-input">
                <input
                  id="provider-key"
                  type={showKey ? 'text' : 'password'}
                  value={providerKeyDraft}
                  onChange={(e) => setProviderKeyDraft(e.target.value)}
                  placeholder={PROVIDERS[provider].placeholder}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  onClick={() => setShowKey((value) => !value)}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="provider-key-status">
                <span className={`status-dot ${providerStatus[provider] ? '' : 'offline'}`} />
                {providerStatus[provider]
                  ? 'A key is saved for this provider.'
                  : 'No key is saved for this provider.'}
              </div>

              <div className="provider-actions">
                <button
                  className="modal-done"
                  onClick={saveKey}
                  disabled={savingKey || deletingKey || !providerKeyDraft.trim()}
                >
                  <Save size={15} />
                  {savingKey ? 'Savingâ€¦' : 'Save API key'}
                </button>

                <button
                  className="delete-key-button"
                  onClick={deleteKey}
                  disabled={savingKey || deletingKey || !providerStatus[provider]}
                >
                  <Trash2 size={15} />
                  {deletingKey ? 'Removingâ€¦' : 'Remove key'}
                </button>
              </div>

              {settingsMessage && (
                <p className="settings-success">{settingsMessage}</p>
              )}

              {settingsError && (
                <p className="settings-error">{settingsError}</p>
              )}
            </div>

            <div className="setting-note">
              <ShieldCheck size={17} />
              <span>
                Offline chat uses local Ollama. Online chat sends your prompts
                to the selected cloud provider and may incur usage charges.
              </span>
            </div>

            <button
              className="modal-done"
              onClick={() => setShowSettings(false)}
            >
              Done
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
