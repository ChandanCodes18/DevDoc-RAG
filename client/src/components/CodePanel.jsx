import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function CodePanel({ content, onClose }) {
  const { language, code, filename } = content;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="code-panel-header">
        <div className="code-panel-tab">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          {filename || `snippet.${language}`}
        </div>
        <span className="code-block-lang">{language}</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="code-panel-body">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language || 'text'}
          showLineNumbers
          lineNumberStyle={{ color: 'var(--text-muted)', fontSize: '12px', userSelect: 'none', minWidth: '40px' }}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: 'var(--bg-code)',
            fontSize: '13px',
            lineHeight: '1.7',
            height: '100%',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
