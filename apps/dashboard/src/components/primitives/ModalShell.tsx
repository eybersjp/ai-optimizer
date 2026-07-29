// ModalShell.tsx
import React, { useEffect } from 'react';

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({ isOpen, onClose, title, children, footer }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ds-overlay" onClick={onClose} role="presentation">
      <div
        className="ds-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-modal-title"
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-color-border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="ds-modal-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'transparent', border: 'none', color: 'var(--ds-color-fg-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
        {footer && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--ds-color-border-default)', backgroundColor: 'var(--ds-color-bg-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
