// CommandBar.tsx
import React from 'react';
import { TextInput } from '../primitives/TextInput';

export interface CommandBarProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
  actions?: React.ReactNode;
}

export const CommandBar: React.FC<CommandBarProps> = ({ placeholder = 'Search commands...', onSearch, actions }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', backgroundColor: 'var(--ds-color-bg-subtle)', border: '1px solid var(--ds-color-border-default)', borderRadius: 'var(--ds-radius-md)', marginBottom: '16px' }}>
      <div style={{ flex: 1 }}>
        <TextInput placeholder={placeholder} onChange={(e) => onSearch && onSearch(e.target.value)} />
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
};
