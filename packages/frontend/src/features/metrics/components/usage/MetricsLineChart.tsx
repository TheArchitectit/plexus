import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { formatMs, formatTPS } from '../../../../lib/format';
import type { TimeRange } from './TimeRangeSelector';
import type { MetricConfig } from './MetricToggleGroup';
import type { UsageRecord } from '../../../../lib/api';

export interface MetricsLineChartDataPoint {
  timestamp: string;
  label: string;
  tps?: number;
  ttft?: number;
  latency?: number;
  requests?: number;
}

interface RollDownConfig {
  buckets: number;
  stepMs: number;
  bucketFormat: (date: Date) => string;
  truncate: (date: Date) => void;
}

const getRollDownConfig = (range: TimeRange): RollDownConfig => {
  const now = new Date();
  now.setSeconds(0, 0);

  switch (range) {
    case 'hour':
      // 1-minute buckets for hour view (60 buckets)
      return {
        buckets: 60,
        stepMs: 60 * 1000, // 1 minute
        bucketFormat: (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        truncate: (d) => d.setSeconds(0, 0)
      };
    case 'day':
      // 1-hour buckets for day view (24 buckets)
      return {
        buckets: 24,
        stepMs: 60 * 60 * 1000, // 1 hour
        bucketFormat: (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        truncate: (d) => { d.setMinutes(0, 0, 0); }
      };
    case 'week':
      // 1-day buckets for week view (7 buckets)
      return {
        buckets: 7,
        stepMs: 24 * 60 * 60 * 1000, // 1 day
        bucketFormat: (d) => d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
        truncate: (d) => { d.setHours(0, 0, 0, 0); }
      };
    case 'month':
      // 1-day buckets for month view (30 buckets)
      return {
        buckets: 30,
        stepMs: 24 * 60 * 60 * 1000, // 1 day
        bucketFormat: (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        truncate: (d) => { d.setHours(0, 0, 0, 0); }
      };
    default:
      return getRollDownConfig('day');
  }
};

const aggregateRecords = (
  records: Partial<UsageRecord>[],
  range: TimeRange
): MetricsLineChartDataPoint[] => {
  const config = getRollDownConfig(range);
  const now = new Date();
  config.truncate(now);
  const nowMs = now.getTime();

  // Initialize buckets
  const buckets = new Map<string, {
    label: string;
    tpsSum: number;
    tpsCount: number;
    ttftSum: number;
    ttftCount: number;
    latencySum: number;
    latencyCount: number;
    requests: number;
  }>();

  for (let i = config.buckets - 1; i >= 0; i--) {
    const bucketTime = new Date(nowMs - i * config.stepMs);
    const label = config.bucketFormat(bucketTime);
    buckets.set(label, {
      label,
      tpsSum: 0,
      tpsCount: 0,
      ttftSum: 0,
      ttftCount: 0,
      latencySum: 0,
      latencyCount: 0,
      requests: 0
    });
  }

  // Aggregate records into buckets
  records.forEach((record) => {
    if (!record.date) return;

    const recordDate = new Date(record.date);
    const recordMs = recordDate.getTime();
    const cutoffMs = nowMs - (config.buckets * config.stepMs);

    // Skip records outside the time range
    if (recordMs < cutoffMs || recordMs > nowMs) return;

    // Truncate to bucket boundary
    const truncatedDate = new Date(recordMs);
    config.truncate(truncatedDate);
    const label = config.bucketFormat(truncatedDate);

    const bucket = buckets.get(label);
    if (!bucket) return;

    // Aggregate metrics
    const tps = record.tokensPerSec;
    const ttft = record.ttftMs;
    const latency = record.durationMs;

    if (tps && tps > 0) {
      bucket.tpsSum += tps;
      bucket.tpsCount++;
    }

    if (ttft && ttft > 0) {
      bucket.ttftSum += ttft;
      bucket.ttftCount++;
    }

    if (latency && latency > 0) {
      bucket.latencySum += latency;
      bucket.latencyCount++;
    }

    bucket.requests++;
  });

  // Convert to data points with averages
  return Array.from(buckets.values()).map((bucket) => ({
    timestamp: bucket.label,
    label: bucket.label,
    tps: bucket.tpsCount > 0 ? bucket.tpsSum / bucket.tpsCount : undefined,
    ttft: bucket.ttftCount > 0 ? bucket.ttftSum / bucket.ttftCount : undefined,
    latency: bucket.latencyCount > 0 ? bucket.latencySum / bucket.latencyCount : undefined,
    requests: bucket.requests
  }));
};

const PERFORMANCE_METRICS: MetricConfig[] = [
  { key: 'tps', label: 'TPS (Tokens/sec)', color: '#3b82f6' },
  { key: 'ttft', label: 'TTFT', color: '#10b981' },
  { key: 'latency', label: 'Latency', color: '#f59e0b' }
];

interface MetricsLineChartProps {
  records: Partial<UsageRecord>[];
  timeRange: TimeRange;
  selectedMetrics: string[];
  loading?: boolean;
  height?: number;
}

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const formatValue = (name: string, value: number): string => {
    if (name.includes('TTFT') || name.includes('Latency')) {
      return formatMs(value);
    }
    if (name.includes('TPS')) {
      return formatTPS(value) + ' tok/s';
    }
    return String(value);
  };

  return (
    <div
      className="bg-bg-card border border-border rounded-lg p-3 shadow-lg"
      style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
    >
      <p className="text-text font-medium mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-secondary text-sm">{entry.name}:</span>
            <span className="text-text font-medium text-sm">
              {formatValue(entry.name, entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MetricsLineChart: React.FC<MetricsLineChartProps> = ({
  records,
  timeRange,
  selectedMetrics,
  loading = false,
  height = 300
}) => {
  const data = useMemo(() => {
    if (!records || records.length === 0) return [];
    return aggregateRecords(records, timeRange);
  }, [records, timeRange]);

  // Calculate Y-axis domains for each metric
  const yAxisDomains = useMemo(() => {
    const domains: Record<string, [number, number]> = {
      tps: [0, 100],
      ttft: [0, 1000],
      latency: [0, 5000]
    };

    if (data.length > 0) {
      selectedMetrics.forEach((metric) => {
        const values = data
          .map((d) => d[metric as keyof MetricsLineChartDataPoint] as number | undefined)
          .filter((v): v is number => v !== undefined && !isNaN(v));

        if (values.length > 0) {
          const max = Math.max(...values);
          // Add 10% padding to the top
          domains[metric] = [0, Math.ceil(max * 1.1)];
        }
      });
    }

    return domains;
  }, [data, selectedMetrics]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-text-secondary">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading metrics...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0 || selectedMetrics.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <p className="text-lg mb-2">No data available</p>
          <p className="text-sm opacity-70">
            {selectedMetrics.length === 0
              ? 'Select at least one metric to display'
              : 'No metrics data for the selected time range'}
          </p>
        </div>
      </div>
    );
  }

  // Check if we have any data for the selected metrics
  const hasDataForSelectedMetrics = selectedMetrics.some((metric) => {
    return data.some((d) => {
      const value = d[metric as keyof MetricsLineChartDataPoint] as number | undefined;
      return value !== undefined && !isNaN(value);
    });
  });

  if (!hasDataForSelectedMetrics) {
    return (
      <div className="h-64 flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <p className="text-lg mb-2">No metrics data</p>
          <p className="text-sm opacity-70">
            No {selectedMetrics.join(', ')} data available for this time range
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-glass)" />
          <XAxis
            dataKey="label"
            stroke="var(--color-text-secondary)"
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
            tickLine={{ stroke: 'var(--color-text-secondary)' }}
            axisLine={{ stroke: 'var(--color-text-secondary)' }}
          />

          {/* Left Y-axis for TPS */}
          {selectedMetrics.includes('tps') && (
            <YAxis
              yAxisId="tps"
              orientation="left"
              stroke={PERFORMANCE_METRICS[0].color}
              tick={{ fill: PERFORMANCE_METRICS[0].color, fontSize: 11 }}
              tickLine={{ stroke: PERFORMANCE_METRICS[0].color }}
              axisLine={{ stroke: PERFORMANCE_METRICS[0].color }}
              domain={yAxisDomains.tps}
              tickFormatter={(value) => formatTPS(value)}
            />
          )}

          {/* Right Y-axis for TTFT and Latency */}
          {(selectedMetrics.includes('ttft') || selectedMetrics.includes('latency')) && (
            <YAxis
              yAxisId="latency"
              orientation="right"
              stroke="var(--color-text-secondary)"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--color-text-secondary)' }}
              axisLine={{ stroke: 'var(--color-text-secondary)' }}
              domain={[
                0,
                Math.max(
                  selectedMetrics.includes('ttft') ? yAxisDomains.ttft[1] as number : 0,
                  selectedMetrics.includes('latency') ? yAxisDomains.latency[1] as number : 0
                ) * 1.1
              ]}
              tickFormatter={(value) => `${(value / 1000).toFixed(1)}s`}
            />
          )}

          <Tooltip content={<CustomTooltip />} />

          {selectedMetrics.length > 1 && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => (
                <span style={{ color: 'var(--color-text)' }}>{value}</span>
              )}
            />
          )}

          {/* TPS Line */}
          {selectedMetrics.includes('tps') && (
            <Line
              yAxisId="tps"
              type="monotone"
              dataKey="tps"
              name="TPS (Tokens/sec)"
              stroke={PERFORMANCE_METRICS[0].color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={false}
            />
          )}

          {/* TTFT Line */}
          {selectedMetrics.includes('ttft') && (
            <Line
              yAxisId="latency"
              type="monotone"
              dataKey="ttft"
              name="TTFT"
              stroke={PERFORMANCE_METRICS[1].color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={false}
            />
          )}

          {/* Latency Line */}
          {selectedMetrics.includes('latency') && (
            <Line
              yAxisId="latency"
              type="monotone"
              dataKey="latency"
              name="Latency"
              stroke={PERFORMANCE_METRICS[2].color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              strokeDasharray="5 5"
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricsLineChart;
