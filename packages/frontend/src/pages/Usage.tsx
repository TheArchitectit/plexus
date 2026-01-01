import React, { useEffect, useState } from 'react';
import { api, UsageData } from '../lib/api';
import { Card } from '../components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Usage = () => {
  const [data, setData] = useState<UsageData[]>([]);

  useEffect(() => {
    api.getUsageData().then(setData);
  }, []);

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Usage Overview</h1>
        <p className="page-description">Token usage and request statistics over time.</p>
      </div>

      <Card title="Requests over Time">
        <div style={{ height: 400, marginTop: '12px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-glass)" />
              <XAxis dataKey="timestamp" stroke="var(--color-text-secondary)" />
              <YAxis stroke="var(--color-text-secondary)" />
              <Tooltip
                contentStyle={{
                    backgroundColor: 'var(--color-bg-card)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                }}
              />
              <Area type="monotone" dataKey="requests" stroke="var(--color-primary)" fill="var(--color-glow)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
