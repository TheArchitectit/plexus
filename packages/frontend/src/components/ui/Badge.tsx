import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, children, className }) => {
  return (
    <div className={clsx('connection-status', status, className)}>
        <span className="connection-dot" />
        {children}
    </div>
  );
};
