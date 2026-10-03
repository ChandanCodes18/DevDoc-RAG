import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { motion, AnimatePresence } from 'framer-motion';
import OrbVisualizer from './components/orbVisualizer';
import Sidebar from './components/Sidebar';
import UploadPanel from './components/UploadPanel';
import MessageBubble from './components/MessageBubble';
import UploadProgress from './components/UploadProgress';
import CodePanel from './components/CodePanel';

function PaperclipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

const SUGGESTION_CHIPS = [
  'How does auth work?',
  'Find all API endpoints',
  'Explain the data flow',
  'Trace the error',
  'List dependencies'
];

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

function CustomDialog({ isOpen, config, onClose }) {
  if (!isOpen || !config) return null;
  const { type, title, message, defaultValue, onConfirm } = config;
  const [val, setVal] = useState('');

  useEffect(() => {
    if (isOpen) setVal(defaultValue || '');
  }, [isOpen, defaultValue]);

  return (
    <div className="sidebar-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '16px', width: '400px', border: '1px solid var(--border-mid)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}
      >
        <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '500' }}>{title}</h3>
        {message && <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>{message}</p>}
        {type === 'prompt' && (
          <input 
            autoFocus
            type="text" 
            value={val} 
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { onConfirm(val); onClose(); }
            }}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontFamily: 'var(--font-sans)', outline: 'none' }}
          />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: type === 'prompt' ? 0 : '24px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          <button 
            onClick={() => { onConfirm(type === 'prompt' ? val : true); onClose(); }} 
            style={{ padding: '8px 16px', borderRadius: '8px', background: type === 'confirm' ? '#ef4444' : 'var(--accent)', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
          >
            {type === 'confirm' ? 'Delete' : 'Save'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  
  // Data Model State
  const [repositories, setRepositories] = useState([]);
  const [activeRepoId, setActiveRepoId] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  
  // Maps chatId -> Array of message objects
  const [messagesByChat, setMessagesByChat] = useState({});

  const [gitUrl, setGitUrl] = useState('');
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadData, setUploadData] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  const [dialogConfig, setDialogConfig] = useState(null);
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);
  const [codePanelContent, setCodePanelContent] = useState(null); 

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const isMobile = useIsMobile();
  
  // Derived View State
  const messages = activeChatId ? (messagesByChat[activeChatId] || []) : [];
  const inChat = messages.length > 0;
  const activeRepo = repositories.find((r) => r.id === activeRepoId);
  const activeChats = chats.filter((c) => c.repoId === activeRepoId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [inputValue, autoResize]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setIsUploading(true);
    const fileSizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    setUploadData({ fileName: file.name, fileSize: fileSizeStr, percent: 10, text: 'Uploading file...' });

    const formData = new FormData();
    formData.append('codeFile', file);

    const t1 = setTimeout(() => setUploadData(d => ({ ...d, percent: 45, text: 'Extracting archive...' })), 500);
    const t2 = setTimeout(() => setUploadData(d => ({ ...d, percent: 85, text: 'Processing codebase...' })), 1000);

    try {
      const res = await fetch(`${API_URL}/api/upload/zip`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to process ZIP file.');

      setRepositories((prev) => [{ id: data.repoId, repo_name: data.repoName, type: 'zip', files: data.fileCount || 100, time: 'just now', status: 'ready' }, ...prev]);
      setActiveRepoId(data.repoId);
      
      const newChatId = Date.now();
      setChats(prev => [{ id: newChatId, repoId: data.repoId, title: 'New Conversation', subtitle: 'Ingestion complete', time: 'just now', msgs: 1 }, ...prev]);
      setActiveChatId(newChatId);

      setMessagesByChat(prev => ({
        ...prev,
        [newChatId]: [{ sender: 'bot', text: `Successfully ingested **${data.repoName}** — ${data.chunkCount || 0} code chunks across ${data.fileCount || 0} files.` }]
      }));

      setIsAttachOpen(false);
    } catch (error) {
      setIsAttachOpen(false);
      alert(error.message || 'Could not reach the server. Make sure the backend is running.');
    } finally {
      clearTimeout(t1); clearTimeout(t2);
      setIsLoading(false);
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleGithubImport = async () => {
    if (!gitUrl.trim()) return;

    setIsLoading(true);
    setIsUploading(true);
    
    const urlParts = gitUrl.trim().split('/');
    const repoNameFallback = urlParts[urlParts.length - 1] || 'repository';

    setUploadData({ fileName: repoNameFallback, fileSize: '', percent: 15, text: 'Cloning repository...' });

    const t1 = setTimeout(() => setUploadData(d => ({ ...d, percent: 55, text: 'Indexing files...' })), 1000);
    const t2 = setTimeout(() => setUploadData(d => ({ ...d, percent: 90, text: 'Generating embeddings...' })), 2000);

    try {
      const res = await fetch(`${API_URL}/api/upload/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUrl: gitUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to import GitHub repository');

      setRepositories((prev) => [{ id: data.repoId, repo_name: data.repoName, type: 'git', files: data.fileCount || 100, time: 'just now', status: 'ready' }, ...prev]);
      setActiveRepoId(data.repoId);
      setGitUrl('');
      
      const newChatId = Date.now();
      setChats(prev => [{ id: newChatId, repoId: data.repoId, title: 'New Conversation', subtitle: 'Import complete', time: 'just now', msgs: 1 }, ...prev]);
      setActiveChatId(newChatId);

      setMessagesByChat(prev => ({
        ...prev,
        [newChatId]: [{ sender: 'bot', text: data.message || 'Successfully imported Github Repository!' }]
      }));

      setIsAttachOpen(false);
    } catch (error) {
      setIsAttachOpen(false);
      alert(error.message || 'Could not reach the server. Make sure the backend is running.');
    } finally {
      clearTimeout(t1); clearTimeout(t2);
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    let currentRepoId = activeRepoId;
    if (!currentRepoId) {
      alert('Please add or select a codebase first.');
      return;
    }

    let currentChatId = activeChatId;
    if (!currentChatId) {
      currentChatId = Date.now();
      setChats(prev => [{ id: currentChatId, repoId: currentRepoId, title: 'New Conversation', subtitle: trimmed, time: 'just now', msgs: 0 }, ...prev]);
      setActiveChatId(currentChatId);
    }

    const currentHistory = messagesByChat[currentChatId] || [];

    setMessagesByChat(prev => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] || []), { sender: 'user', text: trimmed }]
    }));
    
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          repoId: currentRepoId,
          history: currentHistory, // send previous messages
        }),
      });
      const data = await res.json();
      
      setMessagesByChat(prev => ({
        ...prev,
        [currentChatId]: [...(prev[currentChatId] || []), { sender: 'bot', text: data.answer || 'No response received.' }]
      }));

      setChats(prev => prev.map(c => 
        c.id === currentChatId 
          ? { ...c, msgs: (c.msgs || 0) + 2, subtitle: trimmed } 
          : c
      ));
    } catch {
      setMessagesByChat(prev => ({
        ...prev,
        [currentChatId]: [...(prev[currentChatId] || []), { sender: 'bot', text: 'Could not reach the server. Make sure the backend is running.' }]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = useCallback((text) => {
    setInputValue(text);
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (inChat) return;
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (SUGGESTION_CHIPS[idx]) handleChipClick(SUGGESTION_CHIPS[idx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [inChat, handleChipClick]);

  return (
    <div className="app-wrapper">
      <CustomDialog 
        isOpen={!!dialogConfig} 
        config={dialogConfig} 
        onClose={() => setDialogConfig(null)} 
      />

      <Sidebar
        isOpen={isSidebarOpen}
        repositories={repositories}
        activeRepoId={activeRepoId}
        chats={activeChats}
        activeChatId={activeChatId}
        onSelectRepo={(id) => {
          setActiveRepoId(id);
          const firstChat = chats.find(c => c.repoId === id);
          setActiveChatId(firstChat ? firstChat.id : null);
          if (isMobile) setIsSidebarOpen(false);
        }}
        onSelectChat={(id) => {
          setActiveChatId(id);
          if (isMobile) setIsSidebarOpen(false);
        }}
        onAddChat={() => {
          if (!activeRepoId) return alert('Please select a repository first.');
          const newChatId = Date.now();
          setChats(prev => [{ id: newChatId, repoId: activeRepoId, title: 'New Conversation', subtitle: 'Start asking questions...', time: 'just now', msgs: 0 }, ...prev]);
          setActiveChatId(newChatId);
        }}
        onRenameRepo={(id) => {
          const repo = repositories.find(r => r.id === id);
          setDialogConfig({
            type: 'prompt',
            title: 'Rename Repository',
            defaultValue: repo?.repo_name || '',
            onConfirm: (newName) => {
              if (newName.trim()) setRepositories(prev => prev.map(r => r.id === id ? { ...r, repo_name: newName.trim() } : r));
            }
          });
        }}
        onDeleteRepo={(id) => {
          setDialogConfig({
            type: 'confirm',
            title: 'Delete Repository',
            message: 'Are you sure you want to remove this repository from your workspace?',
            onConfirm: () => {
              setRepositories(prev => prev.filter(r => r.id !== id));
              if (activeRepoId === id) setActiveRepoId(null);
            }
          });
        }}
        onRenameChat={(id) => {
          const chat = chats.find(c => c.id === id);
          setDialogConfig({
            type: 'prompt',
            title: 'Rename Chat',
            defaultValue: chat?.title || '',
            onConfirm: (newName) => {
              if (newName.trim()) setChats(prev => prev.map(c => c.id === id ? { ...c, title: newName.trim() } : c));
            }
          });
        }}
        onDeleteChat={(id) => {
          setDialogConfig({
            type: 'confirm',
            title: 'Delete Chat',
            message: 'Are you sure you want to delete this conversation?',
            onConfirm: () => {
              const updatedChats = chats.filter(c => c.id !== id);
              setChats(updatedChats);
              
              setMessagesByChat(prev => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
              });

              if (activeChatId === id) {
                 const remaining = updatedChats.filter(c => c.repoId === activeRepoId);
                 setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
              }
            }
          });
        }}
        onClose={() => setIsSidebarOpen(false)}
        onAddCodebase={() => setIsAttachOpen(true)}
        isMobile={isMobile}
      />

      <main className="main-area">
        <header className="header-bar">
          <div className="header-left">
            {!isSidebarOpen && (
              <button
                className="menu-toggle"
                type="button"
                aria-label="Open sidebar"
                aria-expanded={isSidebarOpen}
                onClick={() => setIsSidebarOpen(true)}
                style={{ display: 'flex' }}
              >
                <MenuIcon />
              </button>
            )}
            {activeRepo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="header-repo-pill-dot" aria-hidden="true" />
                <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '15px' }}>{activeRepo.repo_name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px', background: 'rgba(61, 130, 247, 0.1)', border: '1px solid rgba(61, 130, 247, 0.2)', borderRadius: '4px', color: 'var(--accent)', fontSize: '11px', fontWeight: '500' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {activeRepo.type === 'git' ? (
                      <>
                        <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/>
                      </>
                    ) : (
                      <>
                        <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" /><polyline points="14 2 14 8 20 8" /><path d="M2 15h10" /><path d="M9 18v-6" />
                      </>
                    )}
                  </svg>
                  {activeRepo.type}
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{activeRepo.files} files indexed</span>
              </div>
            )}
          </div>

          <div className="header-right">
            <button onClick={() => setIsAttachOpen(true)} className="header-add-btn">
              + Add codebase
            </button>
            <button 
              className={`code-panel-toggle${isCodePanelOpen ? ' active' : ''}`}
              onClick={() => setIsCodePanelOpen(v => !v)}
              disabled={!codePanelContent}
              title={!codePanelContent ? 'No code snippet to display' : 'Toggle code panel'}
            >
              <CodeIcon />
              Code
            </button>
          </div>
        </header>

        <UploadPanel
          isOpen={isAttachOpen}
          onClose={() => { if (!isUploading) setIsAttachOpen(false); }}
          gitUrl={gitUrl}
          onGitUrlChange={setGitUrl}
          onFileUpload={handleFileUpload}
          onGithubImport={handleGithubImport}
          isUploading={isUploading}
          uploadData={uploadData}
        />

        <AnimatePresence>
          {!inChat && (
            <motion.div
              className="welcome-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="welcome-heading">Good evening, Developer</h1>
              <p className="welcome-subtitle">How can I help you today?</p>

              <div className="input-bar-container" style={{ width: '100%', maxWidth: '640px', marginBottom: '24px' }}>
                <textarea
                  ref={textareaRef}
                  className="input-textarea"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={autoResize}
                  placeholder="Ask DevDoc AI..."
                  disabled={isLoading}
                  rows={1}
                  aria-label="Chat input"
                  style={{ minHeight: '32px' }}
                />
                
                <div className="input-bar-actions">
                  <div className="input-shortcuts">
                    <button className="attach-btn" onClick={() => setIsAttachOpen(v => !v)}>
                      <PaperclipIcon /> Attach
                    </button>
                  </div>
                  
                  <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={isLoading || !inputValue.trim()}
                    type="button"
                    aria-label="Send message"
                  >
                    <ArrowUpIcon />
                  </button>
                </div>
              </div>

              <div className="welcome-chips">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    className="welcome-chip"
                    onClick={() => handleChipClick(chip)}
                    type="button"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {inChat && (
          <div className="message-list" role="log" aria-label="Conversation">
            <div className="message-list-inner">
              <AnimatePresence>
                {uploadProgress && (
                  <UploadProgress
                    fileName={uploadProgress.fileName}
                    status={uploadProgress.status}
                  />
                )}
              </AnimatePresence>

              {messages.map((msg, index) => (
                <MessageBubble 
                  key={index} 
                  message={msg}
                  isLatest={index === messages.length - 1 && !isLoading} 
                  onShowInPanel={(lang, code, filename) => {
                    setCodePanelContent({ language: lang, code, filename });
                    setIsCodePanelOpen(true);
                  }}
                />
              ))}

              {isLoading && (
                <motion.div
                  className="message-row bot"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bot-avatar loading-avatar" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="4 7 11 12 4 17" />
                      <line className="terminal-cursor" x1="13" y1="19" x2="20" y2="19" />
                    </svg>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {inChat && (
          <div className="bottom-dock">
            <div className="bottom-dock-inner">
              <div className="input-bar-container">
                <textarea
                  className="input-textarea"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  placeholder="Ask about the codebase..."
                  disabled={isLoading}
                  rows={1}
                  aria-label="Chat input"
                />
                
                <div className="input-bar-actions">
                  <div className="input-shortcuts">
                    <button className="attach-btn" onClick={() => setIsAttachOpen(v => !v)}>
                      <PaperclipIcon />
                    </button>
                  </div>
                  
                  <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={isLoading || !inputValue.trim()}
                    type="button"
                    aria-label="Send message"
                  >
                    <ArrowUpIcon />
                  </button>
                </div>
              </div>
              
              <p className="input-footer-disclaimer">DevDoc can make mistakes. Always verify critical code information.</p>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isCodePanelOpen && codePanelContent && (
          <motion.div
            className="code-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <CodePanel
              content={codePanelContent}
              onClose={() => setIsCodePanelOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
