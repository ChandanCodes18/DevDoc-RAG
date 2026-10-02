import { motion } from 'framer-motion';

const STATES = {
  scanning:  { label: 'Scanning files…', progress: 30 },
  embedding: { label: 'Generating embeddings…', progress: 70 },
  done:      { label: 'Complete', progress: 100 },
};

export default function UploadProgress({ fileName, status = 'scanning' }) {
  const state = STATES[status] || STATES.scanning;

  return (
    <motion.div
      className="upload-progress-row"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="upload-progress-card" role="status" aria-live="polite">
        <div className="upload-progress-header">
          {status !== 'done' && (
            <div className={`upload-progress-dot ${status}`} aria-hidden="true" />
          )}
          {status === 'done' && (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--rc-green)" aria-hidden="true">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
            </svg>
          )}
          <span className="upload-progress-filename">
            {fileName || 'Uploading codebase'}
          </span>
          <span className="upload-progress-status">{state.label}</span>
        </div>

        {/* Progress track */}
        <div className="upload-progress-track" aria-hidden="true">
          <motion.div
            className="upload-progress-fill"
            initial={{ width: '0%' }}
            animate={{ width: `${state.progress}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
}
