// RiskBadge.tsx
import React from 'react';
import { Badge } from '../primitives/Badge';

export interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const configMap = {
    low: { variant: 'neutral', symbol: '🛡', label: 'LOW RISK' },
    medium: { variant: 'warning', symbol: '⚠️', label: 'MED RISK' },
    high: { variant: 'danger', symbol: '🔥', label: 'HIGH RISK' },
    critical: { variant: 'danger', symbol: '🚨', label: 'CRITICAL RISK' }
  } as const;

  const config = configMap[level];

  return (
    <Badge variant={config.variant}>
      <span aria-hidden="true" style={{ marginRight: '4px' }}>{config.symbol}</span>
      <span>{config.label}</span>
    </Badge>
  );
};
