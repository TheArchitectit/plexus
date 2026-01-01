import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { api, Stat, UsageData } from '../lib/api';
import { Activity, Server, Zap, Database } from 'lucide-react';
import { RecentActivityChart } from '../components/dashboard/RecentActivityChart';

const icons: Record<string, React.ReactNode> = {
  'Total Requests': <Activity size={20} />,
  'Active Providers': <Server size={20} />,
  'Total Tokens': <Database size={20} />,
  'Avg Latency': <Zap size={20} />,
};

export const Dashboard = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
        const [statsData, usage] = await Promise.all([
            api.getStats(),
            api.getUsageData()
        ]);
        setStats(statsData);
        setUsageData(usage);
    };
    loadData();
  }, []);

  return (
    <div className="dashboard">
      <div className="header">
          <div className="header-left">
            <h1 className="page-title">Dashboard</h1>
            <Badge status="connected">System Online</Badge>
          </div>
          <div className="header-right">
              <span className="last-updated">Last updated: Just now</span>
          </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-header">
                <span className="stat-label">{stat.label}</span>
                 <div className="stat-icon" style={{background: 'var(--color-bg-hover)'}}>
                    {icons[stat.label] || <Activity size={20} />}
                 </div>
            </div>
            <div className="stat-value">{stat.value}</div>
            {stat.change && (
                <div className={`stat-meta ${stat.change > 0 ? 'success' : 'failure'}`}>
                    {stat.change > 0 ? '+' : ''}{stat.change}% from last week
                </div>
            )}
          </div>
        ))}
      </div>

      <div className="charts-row">
          <Card className="chart-large" title="Recent Activity">
             <RecentActivityChart data={usageData} />
          </Card>
          <Card className="chart-small" title="Quick Actions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ width: '100%' }}>New Provider</button>
                  <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/logs')}>View Logs</button>
              </div>
          </Card>
      </div>
    </div>
  );
};
