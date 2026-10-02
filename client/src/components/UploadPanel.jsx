import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const OVERLAY_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const MODAL_VARIANTS = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

function GitBranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function ZipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M2 15h10" />
      <path d="M9 18v-6" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#34D399' }}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" />
      <polyline points="16 12 12 8 8 12" />
      <line x1="12" y1="8" x2="12" y2="21" />
    </svg>
  );
}

export default function UploadPanel({ isOpen, onClose, gitUrl, onGitUrlChange, onFileUpload, onGithubImport, isUploading, uploadData }) {
  const [activeTab, setActiveTab] = useState('git');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.zip')) {
      const syntheticEvent = { target: { files: [file], value: '' } };
      onFileUpload(syntheticEvent);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onGithubImport();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(2px)' }}
            variants={OVERLAY_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />
          <motion.div
            variants={MODAL_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '480px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-mid)',
              borderRadius: '16px',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            role="dialog"
            aria-label="Add Codebase"
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px', borderBottom: '1px solid var(--border-dim)' }}>
              <div>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: '600' }}>Add Codebase</h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Index a repository or archive for RAG</p>
              </div>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                <CloseIcon />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {isUploading ? (
                <>
                  {/* Uploading State */}
                  <style>{`
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                  `}</style>
                  <div style={{
                    border: '1px dashed var(--border-active)',
                    borderRadius: '10px',
                    padding: '40px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'var(--bg-surface)',
                    marginBottom: '24px'
                  }}>
                    <BoxIcon />
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ color: 'var(--accent)', fontSize: '15px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>{uploadData?.fileName || 'Uploading...'}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{uploadData?.fileSize || ''}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{uploadData?.text || 'Processing...'}</span>
                    <span style={{ color: 'var(--accent)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{uploadData?.percent || 0}%</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--border-dim)', borderRadius: '2px', overflow: 'hidden', marginBottom: '24px' }}>
                    <div style={{ width: `${uploadData?.percent || 0}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s ease' }} />
                  </div>

                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(61, 130, 247, 0.1)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'var(--accent)',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: 0.8
                    }}
                  >
                    <SpinnerIcon /> Processing...
                  </button>
                </>
              ) : (
                <>
                  {/* Tabs */}
                  <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border-dim)', marginBottom: '24px' }}>
                    <button
                      onClick={() => setActiveTab('git')}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '8px 0',
                        background: activeTab === 'git' ? 'var(--bg-elevated)' : 'transparent',
                        border: '1px solid',
                        borderColor: activeTab === 'git' ? 'var(--border-active)' : 'transparent',
                        borderRadius: '6px',
                        color: activeTab === 'git' ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      <GitBranchIcon /> Git URL
                    </button>
                    <button
                      onClick={() => setActiveTab('zip')}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '8px 0',
                        background: activeTab === 'zip' ? 'var(--bg-elevated)' : 'transparent',
                        border: '1px solid',
                        borderColor: activeTab === 'zip' ? 'var(--border-active)' : 'transparent',
                        borderRadius: '6px',
                        color: activeTab === 'zip' ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      <ZipIcon /> ZIP Upload
                    </button>
                  </div>

                  {activeTab === 'git' ? (
                    <>
                      <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Repository URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://github.com/owner/repo"
                        value={gitUrl}
                        onChange={(e) => onGitUrlChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                          width: '100%',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-active)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          fontFamily: 'var(--font-mono)',
                          outline: 'none',
                          marginBottom: '12px'
                        }}
                        spellCheck={false}
                        autoComplete="off"
                      />
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px', marginBottom: '24px' }}>
                        Supports GitHub, GitLab, and Bitbucket. Private repos require auth.
                      </p>

                      <button
                        onClick={onGithubImport}
                        disabled={!gitUrl.trim()}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'var(--rc-green)',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: gitUrl.trim() ? 'pointer' : 'not-allowed',
                          opacity: gitUrl.trim() ? 1 : 0.6
                        }}
                      >
                        Index Codebase
                      </button>
                    </>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: isDragOver ? '2px dashed var(--rc-green)' : '2px dashed var(--border-active)',
                        borderRadius: '10px',
                        padding: '32px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        background: isDragOver ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        onChange={onFileUpload}
                        style={{ display: 'none' }}
                      />
                      <div style={{ color: 'var(--rc-blue)' }}>
                        <UploadIcon />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', display: 'block' }}>Drop ZIP here or click to browse</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>.zip archives only</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
