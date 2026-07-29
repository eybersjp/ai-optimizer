// Tabs.tsx
import React, { useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
  onChange?: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ items, defaultTabId, onChange }) => {
  const [activeId, setActiveId] = useState(defaultTabId || items[0]?.id);

  const handleSelect = (id: string) => {
    setActiveId(id);
    if (onChange) onChange(id);
  };

  const activeTab = items.find((item) => item.id === activeId);

  return (
    <div className="ds-tabs">
      <div className="ds-tabs__list" role="tablist">
        {items.map((item) => {
          const isSelected = item.id === activeId;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`panel-${item.id}`}
              id={`tab-${item.id}`}
              className="ds-tabs__tab"
              onClick={() => handleSelect(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeTab && (
        <div
          role="tabpanel"
          id={`panel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          className="ds-tabs__panel"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
};
