import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  extra?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, extra, children, className, ...props }) => {
  return (
    <div className={clsx('card', className)} {...props}>
      {(title || extra) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {extra && <div className="card-extra">{extra}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
};
