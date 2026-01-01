import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Settings, Server, Box, FileText } from 'lucide-react';
import { clsx } from 'clsx';

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Plexus Collector</h1>
        <p className="sidebar-subtitle">AI Infrastructure Management</p>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/usage" className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
          <Activity size={20} />
          <span>Usage</span>
        </NavLink>
        <NavLink to="/logs" className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
          <FileText size={20} />
          <span>Logs</span>
        </NavLink>
        
        <div className="nav-section">
            <h3 className="nav-section-title">Configuration</h3>
            <NavLink to="/providers" className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
            <Server size={20} />
            <span>Providers</span>
            </NavLink>
            <NavLink to="/models" className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
            <Box size={20} />
            <span>Models</span>
            </NavLink>
             <NavLink to="/config" className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
            <Settings size={20} />
            <span>Settings</span>
            </NavLink>
        </div>
      </nav>
    </aside>
  );
};
