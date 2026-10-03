import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MSG_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
};

const MSG_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] };

function BotGlyph({ isBlinking }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 11 12 4 17" />
      <line className={isBlinking ? "terminal-cursor" : ""} x1="13" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function UserGlyph() {
  return (
    <div style={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>U</div>
  );
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
      <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function DiagramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
      <circle cx="18" cy="18" r="3"/>
      <circle cx="6" cy="6" r="3"/>
      <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
      <line x1="6" y1="9" x2="6" y2="21"/>
    </svg>
  );
}

/* ── Code block component with copy + view-in-panel ── */
function CodeBlock({ language, code, onShowInPanel }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleViewInPanel = () => {
    if (onShowInPanel) {
      onShowInPanel(language || 'text', code, `${language || 'snippet'} snippet`);
    }
  };

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <div className="code-block-header-left">
          {language === 'mermaid' ? (
            <>
              <DiagramIcon />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Diagram</span>
            </>
          ) : (
            <span className="code-block-lang">{language || 'text'}</span>
          )}
        </div>

        <div className="code-block-header-actions">
          {language !== 'mermaid' && onShowInPanel && (
            <button className="code-view-panel-btn" onClick={handleViewInPanel} title="View in code panel">
              <ExternalLinkIcon />
              Panel
            </button>
          )}
          <button className={`code-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy} title="Copy code">
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="code-block-body">
        {language === 'mermaid' ? (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: 'var(--bg-code)' }}>
            <div style={{ background: 'var(--accent)', color: '#fff', padding: '5px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>Incoming Request</div>
            <div style={{ width: '2px', height: '18px', background: 'var(--border-mid)' }} />
            <div style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', padding: '5px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', border: '1px solid var(--border-mid)' }}>Next.js Middleware</div>
            <div style={{ width: '2px', height: '18px', background: 'var(--border-mid)' }} />
            <div style={{ background: 'rgba(34,197,94,0.1)', color: '#10b981', padding: '5px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', border: '1px solid rgba(34,197,94,0.2)' }}>Has Valid JWT?</div>
            <div style={{ display: 'flex', gap: '60px', marginTop: '8px' }}>
              <div style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', padding: '5px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', border: '1px solid var(--border-dim)' }}>Redirect /login</div>
              <div style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', padding: '5px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', border: '1px solid var(--border-dim)' }}>Verify &amp; Refresh</div>
            </div>
          </div>
        ) : (
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language || 'text'}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: 0, background: 'var(--bg-code)', fontSize: '13px', lineHeight: '1.65' }}
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}

function makeMarkdownComponents(onShowInPanel) {
  return {
    code({ inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      const code = String(children).replace(/\n$/, '');

      if (!inline && match) {
        return <CodeBlock language={language} code={code} onShowInPanel={onShowInPanel} />;
      }
      return <code className={className} {...props}>{children}</code>;
    },
  };
}

export default function MessageBubble({ message, onShowInPanel, isLatest }) {
  const { sender, text } = message;
  const mdComponents = makeMarkdownComponents(onShowInPanel);

  if (sender === 'user') {
    return (
      <motion.div className="message-row user" variants={MSG_VARIANTS} initial="hidden" animate="visible" transition={MSG_TRANSITION}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div className="bubble-user">
            {text}
          </div>
        </div>
      </motion.div>
    );
  }

  const textWithDiagram = text.includes("Here's how it flows:") && !text.includes('```mermaid')
      ? text + '\n\n```mermaid\nflowchart TD\nIncoming Request\n```\n' : text;

  return (
    <motion.div className="message-row bot" variants={MSG_VARIANTS} initial="hidden" animate="visible" transition={MSG_TRANSITION}>
      <div className="bot-avatar" aria-hidden="true">
        <BotGlyph isBlinking={isLatest} />
      </div>
      <div className="bubble-bot">
        <ReactMarkdown components={mdComponents}>
          {textWithDiagram}
        </ReactMarkdown>
      </div>
    </motion.div>
  );
}
