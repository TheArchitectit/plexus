import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, id, ...props }) => {
  const inputId = id || props.name || Math.random().toString(36).substr(2, 9);

  return (
    <div className={clsx('input-wrapper', { 'input-has-error': !!error })}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx('input-field', className)}
        {...props}
      />
      {error && <span className="input-error">{error}</span>}
    </div>
  );
};
