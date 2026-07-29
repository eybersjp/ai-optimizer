// DrawerShell.tsx
import React, { useEffect } from 'react';

export interface DrawerShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const DrawerShell: React.FC<DrawerShellProps> = ({ isOpen, onClose, title, children }) => {
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
        className="ds-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ds-drawer-title"
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-color-border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="ds-drawer-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{ background: 'transparent', border: 'none', color: 'var(--ds-color-fg-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
};
