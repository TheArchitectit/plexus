import React from 'react';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <div className="main-content-inner">
            {children}
        </div>
      </main>
    </div>
  );
};
