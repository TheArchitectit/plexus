import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'neutral' | 'warning';
  children: React.ReactNode;
  secondaryText?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ status, children, secondaryText, className, style }) => {
  return (
    <div className={clsx('connection-status', status, className)} style={{ ...style, height: secondaryText ? 'auto' : undefined, padding: secondaryText ? '4px 12px' : undefined }}>
        <span className="connection-dot" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
            <span style={{ fontWeight: 600 }}>{children}</span>
            {secondaryText && <span style={{ fontSize: '9px', opacity: 0.7, marginTop: '2px' }}>{secondaryText}</span>}
        </div>
    </div>
  );
};
