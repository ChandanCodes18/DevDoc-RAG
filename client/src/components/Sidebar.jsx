import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SIDEBAR_VARIANTS = {
  hidden: { x: -260, opacity: 0 },
  visible: { x: 0, opacity: 1 },
};

const DESKTOP_VARIANTS = {
  hidden: { width: 0, minWidth: 0, opacity: 0 },
  visible: { width: 260, minWidth: 260, opacity: 1 },
};

const SIDEBAR_TRANSITION = { duration: 0.26, ease: [0.22, 1, 0.36, 1] };

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function GitIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 0 1 2 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  );
}

function ZipIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M2 15h10" />
      <path d="M9 18v-6" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function Sidebar({
  isOpen, repositories, activeRepoId, chats, activeChatId,
  onSelectRepo, onSelectChat, onAddChat, onRenameRepo, onDeleteRepo, onRenameChat, onDeleteChat,
  onClose, onAddCodebase, isMobile
}) {
  const [activeTab, setActiveTab] = useState('projects');
  
  const displayRepos = repositories.map(r => ({
    ...r,
    type: r.type || 'git',
    files: r.files || 0,
    time: r.time || 'just now',
    status: r.status || 'ready'
  }));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {isMobile && isOpen && (
            <motion.div
              className="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
          )}

          <motion.aside
            className="sidebar"
            variants={isMobile ? SIDEBAR_VARIANTS : DESKTOP_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={SIDEBAR_TRANSITION}
            aria-label="Navigation sidebar"
            style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            {/* Logo */}
            <div className="sidebar-logo-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'var(--accent)', color: '#fff', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px' }}>
                  D
                </div>
                <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>DevDoc</span>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CollapseIcon />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', padding: '0 16px', marginBottom: '16px' }}>
              <button 
                onClick={() => setActiveTab('projects')}
                style={{ flex: 1, padding: '6px 0', background: activeTab === 'projects' ? 'var(--bg-elevated)' : 'transparent', border: '1px solid', borderColor: activeTab === 'projects' ? 'var(--border-dim)' : 'transparent', borderRadius: '6px', color: activeTab === 'projects' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Projects
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                style={{ flex: 1, padding: '6px 0', background: activeTab === 'history' ? 'var(--bg-elevated)' : 'transparent', border: '1px solid', borderColor: activeTab === 'history' ? 'var(--border-dim)' : 'transparent', borderRadius: '6px', color: activeTab === 'history' ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                History
              </button>
            </div>

            {activeTab === 'projects' ? (
              <>
                <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                  <button onClick={onAddCodebase} style={{ width: '100%', padding: '8px 0', background: 'transparent', border: '1px dashed var(--border-dim)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-dim)' }}>
                    + Add codebase
                  </button>
                </div>

                <div className="sidebar-body" style={{ flex: 1, overflowY: 'auto' }}>
                  {displayRepos.map((repo) => {
                    const isActive = repo.id === activeRepoId;
                    return (
                      <button
                        key={repo.id}
                        className={`repo-item${isActive ? ' active' : ''}`}
                        onClick={() => {
                          onSelectRepo(repo.id);
                          if (isMobile) onClose();
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: repo.status === 'indexing' ? '#f59e0b' : 'var(--accent)', flexShrink: 0 }} />
                          <span style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {repo.repo_name}
                          </span>
                          
                          <div className="repo-actions" style={{ display: 'flex', gap: '4px' }}>
                            <div
                              onClick={(e) => { e.stopPropagation(); onRenameRepo(repo.id); }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                              title="Rename"
                            ><PencilIcon /></div>
                            <div
                              onClick={(e) => { e.stopPropagation(); onDeleteRepo(repo.id); }}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                              title="Delete"
                            ><TrashIcon /></div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px', background: 'rgba(61, 130, 247, 0.1)', border: '1px solid rgba(61, 130, 247, 0.2)', borderRadius: '4px', color: 'var(--accent)', fontSize: '11px', fontWeight: '500' }}>
                            {repo.type === 'git' ? <GitIcon /> : <ZipIcon />}
                            {repo.type}
                          </div>
                        </div>
                        
                        {repo.status === 'indexing' ? (
                          <div style={{ marginTop: '8px', paddingLeft: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                              <span>Indexing {repo.indexed}/{repo.files} files</span>
                              <span style={{ color: '#f59e0b' }}>{repo.percent}%</span>
                            </div>
                            <div style={{ width: '100%', height: '2px', background: 'var(--border-dim)', borderRadius: '1px', overflow: 'hidden' }}>
                              <div style={{ width: `${repo.percent}%`, height: '100%', background: '#f59e0b' }} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: '4px', paddingLeft: '14px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {repo.files} files • {repo.time}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="sidebar-body" style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <button onClick={onAddChat} style={{ width: '100%', padding: '8px 0', background: 'transparent', border: '1px dashed var(--border-dim)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-dim)' }}>
                    + New Chat
                  </button>
                </div>

                {chats && chats.length > 0 ? chats.map((item) => {
                  const isChatActive = item.id === activeChatId;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => onSelectChat(item.id)}
                      className={`chat-item${isChatActive ? ' active' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <div style={{ color: isChatActive ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        <div className="chat-actions" style={{ display: 'flex', gap: '4px' }}>
                          <div
                            onClick={(e) => { e.stopPropagation(); onRenameChat(item.id); }}
                            style={{ color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                            title="Rename"
                          ><PencilIcon /></div>
                          <div
                            onClick={(e) => { e.stopPropagation(); onDeleteChat(item.id); }}
                            style={{ color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            title="Delete"
                          ><TrashIcon /></div>
                        </div>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subtitle}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{item.time} • {item.msgs} msgs</div>
                    </button>
                  );
                }) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '24px' }}>No history for this project.</div>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
