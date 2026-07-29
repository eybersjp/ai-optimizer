// DetailDrawerLayout.tsx
import React from 'react';
import { DrawerShell } from '../primitives/DrawerShell';

export interface DetailDrawerLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const DetailDrawerLayout: React.FC<DetailDrawerLayoutProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <DrawerShell isOpen={isOpen} onClose={onClose} title={title}>
      {children}
    </DrawerShell>
  );
};
