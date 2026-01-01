import React, { useEffect, useState } from 'react';
import { api, UsageData } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TimeRange = 'hour' | 'day' | 'week' | 'month';

export const Usage = () => {
  const [data, setData] = useState<UsageData[]>([]);
  const [range, setRange] = useState<TimeRange>('week');

  useEffect(() => {
    api.getUsageData(range).then(setData);
  }, [range]);

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Usage Overview</h1>
        <p className="page-description">Token usage and request statistics over time.</p>
      </div>

      <Card 
        title="Requests over Time"
        extra={
            <div style={{ display: 'flex', gap: '8px' }}>
                {(['hour', 'day', 'week', 'month'] as TimeRange[]).map(r => (
                    <Button 
                        key={r} 
                        size="sm" 
                        variant={range === r ? 'primary' : 'secondary'} 
                        onClick={() => setRange(r)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {r}
                    </Button>
                ))}
            </div>
        }
      >
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
