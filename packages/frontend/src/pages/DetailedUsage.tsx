import { useState, useMemo, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useMetricsStream } from '../features/metrics/hooks/useMetricsStream';
import { api, type UsageRecord } from '../lib/api';
import { formatCost, formatMs, formatNumber, formatTokens, formatTimeAgo } from '../lib/format';
import { Activity, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, TrendingUp, Clock, DollarSign, Database, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { MetricsLineChart } from '../features/metrics/components/usage/MetricsLineChart';
import { TimeRangeSelector, type TimeRange } from '../features/metrics/components/usage/TimeRangeSelector';
import { MetricToggleGroup } from '../features/metrics/components/usage/MetricToggleGroup';

type ChartType = 'line' | 'bar' | 'area' | 'pie';
type GroupBy = 'time' | 'provider' | 'model' | 'apiKey' | 'status';

interface MetricConfig {
  key: string;
  label: string;
  color: string;
  format: (value: number) => string;
}

const METRICS: MetricConfig[] = [
  { key: 'requests', label: 'Requests', color: '#3b82f6', format: (v) => formatNumber(v, 0) },
  { key: 'tokens', label: 'Tokens', color: '#10b981', format: (v) => formatTokens(v) },
  { key: 'cost', label: 'Cost', color: '#f59e0b', format: (v) => formatCost(v, 4) },
  { key: 'duration', label: 'Duration', color: '#8b5cf6', format: (v) => formatMs(v) },
  { key: 'ttft', label: 'TTFT', color: '#ec4899', format: (v) => formatMs(v) }
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];

// Performance metrics for the line chart
const PERFORMANCE_METRICS = [
  { key: 'tps', label: 'TPS', color: '#3b82f6' },
  { key: 'ttft', label: 'TTFT', color: '#10b981' },
  { key: 'latency', label: 'Latency', color: '#f59e0b' }
];

/**
 * Connection status indicator component
 */
const ConnectionIndicator = ({
  status,
  isStale,
  onReconnect
}: {
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  isStale: boolean;
  onReconnect: () => void;
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return isStale
          ? { icon: <Wifi size={14} />, text: 'Stale', color: 'text-warning' }
          : { icon: <Wifi size={14} />, text: 'Live', color: 'text-success' };
      case 'connecting':
        return { icon: <RefreshCw size={14} className="animate-spin" />, text: 'Connecting...', color: 'text-text-muted' };
      case 'reconnecting':
        return { icon: <RefreshCw size={14} className="animate-spin" />, text: 'Reconnecting...', color: 'text-warning' };
      case 'error':
      case 'disconnected':
        return { icon: <WifiOff size={14} />, text: 'Disconnected', color: 'text-danger' };
      default:
        return { icon: <Wifi size={14} />, text: 'Unknown', color: 'text-text-muted' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <span className={`flex items-center gap-1.5 text-xs ${config.color}`}>
        {config.icon}
        {config.text}
      </span>
      {(status === 'error' || status === 'disconnected') && (
        <button
          onClick={onReconnect}
          className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

export const DetailedUsage = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [groupBy, setGroupBy] = useState<GroupBy>('time');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['requests', 'tokens', 'cost']);
  const [loading, setLoading] = useState(false);
  const [aggregatedData, setAggregatedData] = useState<any[]>([]);

  // Performance metrics chart state
  const [perfTimeRange, setPerfTimeRange] = useState<TimeRange>('day');
  const [selectedPerfMetrics, setSelectedPerfMetrics] = useState<string[]>(['tps', 'ttft', 'latency']);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfRecords, setPerfRecords] = useState<Partial<UsageRecord>[]>([]);

  // Use SSE hook for real-time data
  const {
    dashboardData,
    connectionStatus,
    lastEventTime,
    isStale,
    reconnect
  } = useMetricsStream({
    autoConnect: true,
    reconnectDelay: 3000,
    maxReconnectAttempts: 5,
    staleThreshold: 60000
  });

  // Compute time ago from last event
  const timeAgo = useMemo(() => {
    if (!lastEventTime) return 'Never';
    const diff = Math.floor((Date.now() - lastEventTime) / 1000);
    return formatTimeAgo(diff);
  }, [lastEventTime]);

  // Compute stats from dashboard data
  const stats = useMemo(() => {
    const todayMetrics = dashboardData?.todayMetrics;
    const totalRequests = todayMetrics?.requests ?? 0;
    const totalTokens = (todayMetrics?.inputTokens ?? 0) + (todayMetrics?.outputTokens ?? 0) +
                       (todayMetrics?.reasoningTokens ?? 0) + (todayMetrics?.cachedTokens ?? 0);
    const totalCost = todayMetrics?.totalCost ?? 0;

    // Calculate success rate from stats if available
    const statsArray = dashboardData?.stats ?? [];
    const successRate = 1; // Default to 100% since we don't have failure data in dashboard

    return [
      { label: 'Total Requests', value: formatNumber(totalRequests, 0), icon: Activity },
      { label: 'Total Tokens', value: formatTokens(totalTokens), icon: Database },
      { label: 'Total Cost', value: formatCost(totalCost, 4), icon: DollarSign },
      { label: 'Avg Duration', value: statsArray.find(s => s.label.includes('Duration'))?.value ?? '0ms', icon: Clock },
      { label: 'Success Rate', value: `${(successRate * 100).toFixed(1)}%`, icon: TrendingUp }
    ];
  }, [dashboardData]);

  const toggleMetric = (metricKey: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricKey)
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  const togglePerfMetric = (metricKey: string) => {
    setSelectedPerfMetrics(prev =>
      prev.includes(metricKey)
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  // Fetch performance records with roll-down logic
  useEffect(() => {
    const fetchPerfRecords = async () => {
      setPerfLoading(true);
      try {
        const now = new Date();
        const startDate = new Date(now);

        // Calculate start date based on time range
        switch (perfTimeRange) {
          case 'hour':
            startDate.setHours(startDate.getHours() - 1);
            break;
          case 'day':
            startDate.setHours(startDate.getHours() - 24);
            break;
          case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'month':
            startDate.setDate(startDate.getDate() - 30);
            break;
        }

        const response = await api.getLogs(5000, 0, {
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        });

        setPerfRecords(response.data || []);
      } catch (e) {
        console.error('Failed to fetch performance records', e);
      } finally {
        setPerfLoading(false);
      }
    };

    void fetchPerfRecords();
  }, [perfTimeRange]);

  // Fetch aggregated data from API when filters change
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.getAggregatedMetrics(timeRange, groupBy);
      setAggregatedData(response.data || []);
    } catch (e) {
      console.error('Failed to fetch aggregated data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [timeRange, groupBy]);

  const refetch = () => {
    void fetchData();
  };

  const renderChart = () => {
    if (groupBy === 'time') {
      const ChartComponent = chartType === 'line' ? LineChart : chartType === 'bar' ? BarChart : AreaChart;

      return (
        <ResponsiveContainer width="100%" height={400}>
          <ChartComponent data={aggregatedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-glass)" />
            <XAxis
              dataKey="name"
              stroke="var(--color-text-secondary)"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              stroke="var(--color-text-secondary)"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--color-text-secondary)"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'var(--color-text)' }}
            />
            <Legend />
            {selectedMetrics.includes('requests') && (
              chartType === 'area' ? (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="requests"
                  name="Requests"
                  stroke={METRICS[0].color}
                  fill={METRICS[0].color}
                  fillOpacity={0.3}
                />
              ) : chartType === 'line' ? (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="requests"
                  name="Requests"
                  stroke={METRICS[0].color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ) : (
                <Bar
                  yAxisId="left"
                  dataKey="requests"
                  name="Requests"
                  fill={METRICS[0].color}
                  radius={[4, 4, 0, 0]}
                />
              )
            )}
            {selectedMetrics.includes('tokens') && (
              chartType === 'area' ? (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="tokens"
                  name="Tokens"
                  stroke={METRICS[1].color}
                  fill={METRICS[1].color}
                  fillOpacity={0.3}
                />
              ) : chartType === 'line' ? (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="tokens"
                  name="Tokens"
                  stroke={METRICS[1].color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ) : (
                <Bar
                  yAxisId="right"
                  dataKey="tokens"
                  name="Tokens"
                  fill={METRICS[1].color}
                  radius={[4, 4, 0, 0]}
                />
              )
            )}
            {selectedMetrics.includes('cost') && (
              chartType === 'area' ? (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  name="Cost"
                  stroke={METRICS[2].color}
                  fill={METRICS[2].color}
                  fillOpacity={0.3}
                />
              ) : chartType === 'line' ? (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  name="Cost"
                  stroke={METRICS[2].color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ) : (
                <Bar
                  yAxisId="right"
                  dataKey="cost"
                  name="Cost"
                  fill={METRICS[2].color}
                  radius={[4, 4, 0, 0]}
                />
              )
            )}
          </ChartComponent>
        </ResponsiveContainer>
      );
    } else {
      const pieData = aggregatedData.map((item, index) => ({
        name: item.name,
        value: item[selectedMetrics[0] as keyof typeof item] as number || 0,
        fill: item.fill || COLORS[index % COLORS.length]
      })).filter(item => item.value > 0);

      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <div className="min-h-screen p-6 transition-all duration-300 bg-gradient-to-br from-bg-deep to-bg-surface">
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-text m-0 mb-2">Detailed Usage</h1>
            <p className="text-text-secondary">Advanced analytics with customizable chart types (server-side aggregation)</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge status="connected" secondaryText={`Last updated: ${timeAgo}`}>
              Live Data
            </Badge>
            <ConnectionIndicator
              status={connectionStatus}
              isStale={isStale}
              onReconnect={reconnect}
            />
          </div>
        </div>
      </div>

      <div className="mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        {stats.map((stat, index) => (
          <div key={index} className="glass-bg rounded-lg p-4 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <span className="font-body text-xs font-semibold text-text-muted uppercase tracking-wider">{stat.label}</span>
              <div className="w-8 h-8 rounded-sm flex items-center justify-center text-text-secondary">
                <stat.icon size={20} />
              </div>
            </div>
            <div className="font-heading text-2xl font-bold text-text">{stat.value}</div>
          </div>
        ))}
      </div>

      <Card className="mb-6" title="Chart Configuration">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-text-muted uppercase">Time Range</span>
            <div className="flex gap-2">
              {(['hour', 'day', 'week', 'month'] as TimeRange[]).map((range) => (
                <Button
                  key={range}
                  size="sm"
                  variant={timeRange === range ? 'primary' : 'secondary'}
                  onClick={() => setTimeRange(range)}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-text-muted uppercase">Group By</span>
            <div className="flex gap-2">
              {[
                { key: 'time', label: 'Time' },
                { key: 'provider', label: 'Provider' },
                { key: 'model', label: 'Model' },
                { key: 'status', label: 'Status' }
              ].map((option) => (
                <Button
                  key={option.key}
                  size="sm"
                  variant={groupBy === option.key ? 'primary' : 'secondary'}
                  onClick={() => setGroupBy(option.key as GroupBy)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-text-muted uppercase">Chart Type</span>
            <div className="flex gap-2">
              {[
                { key: 'area', icon: LineChartIcon, label: 'Area' },
                { key: 'line', icon: LineChartIcon, label: 'Line' },
                { key: 'bar', icon: BarChart3, label: 'Bar' },
                { key: 'pie', icon: PieChartIcon, label: 'Pie' }
              ].map((type) => (
                <Button
                  key={type.key}
                  size="sm"
                  variant={chartType === type.key ? 'primary' : 'secondary'}
                  onClick={() => setChartType(type.key as ChartType)}
                  disabled={groupBy !== 'time' && type.key !== 'pie'}
                >
                  <type.icon size={16} className="mr-1" />
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {groupBy === 'time' && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-text-muted uppercase">Metrics</span>
              <div className="flex gap-2 flex-wrap">
                {METRICS.slice(0, 4).map((metric) => (
                  <button
                    key={metric.key}
                    onClick={() => toggleMetric(metric.key)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      selectedMetrics.includes(metric.key)
                        ? 'bg-primary text-white'
                        : 'bg-bg-hover text-text-secondary hover:text-text'
                    }`}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card
        title={`Usage by ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`}
        extra={
          <Button size="sm" variant="secondary" onClick={refetch} isLoading={loading}>
            Refresh
          </Button>
        }
      >
        {aggregatedData.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-text-secondary">
            No data available for the selected time range
          </div>
        ) : (
          renderChart()
        )}
      </Card>

      {groupBy !== 'time' && aggregatedData.length > 0 && (
        <Card className="mt-6" title="Detailed Breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border-glass text-text-secondary">
                  <th className="py-3 pr-4">{groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</th>
                  <th className="py-3 pr-4">Requests</th>
                  <th className="py-3 pr-4">Tokens</th>
                  <th className="py-3 pr-4">Cost</th>
                  <th className="py-3 pr-4">Avg Duration</th>
                  <th className="py-3 pr-4">Avg TTFT</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedData.map((row, index) => (
                  <tr key={index} className="border-b border-border-glass/50">
                    <td className="py-3 pr-4 font-medium">{row.name}</td>
                    <td className="py-3 pr-4">{formatNumber(row.requests, 0)}</td>
                    <td className="py-3 pr-4">{formatTokens(row.tokens)}</td>
                    <td className="py-3 pr-4">{formatCost(row.cost, 6)}</td>
                    <td className="py-3 pr-4">{formatMs(row.duration)}</td>
                    <td className="py-3 pr-4">{formatMs(row.ttft)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Performance Metrics Chart Section */}
      <Card className="mt-6" title="Performance Metrics">
        <div className="mb-6">
          <div className="flex flex-wrap gap-6 items-start">
            <TimeRangeSelector
              value={perfTimeRange}
              onChange={setPerfTimeRange}
            />
            <MetricToggleGroup
              metrics={PERFORMANCE_METRICS}
              selected={selectedPerfMetrics}
              onToggle={togglePerfMetric}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const fetchPerfRecords = async () => {
                  setPerfLoading(true);
                  try {
                    const now = new Date();
                    const startDate = new Date(now);

                    switch (perfTimeRange) {
                      case 'hour':
                        startDate.setHours(startDate.getHours() - 1);
                        break;
                      case 'day':
                        startDate.setHours(startDate.getHours() - 24);
                        break;
                      case 'week':
                        startDate.setDate(startDate.getDate() - 7);
                        break;
                      case 'month':
                        startDate.setDate(startDate.getDate() - 30);
                        break;
                    }

                    const response = await api.getLogs(5000, 0, {
                      startDate: startDate.toISOString(),
                      endDate: now.toISOString()
                    });

                    setPerfRecords(response.data || []);
                  } catch (e) {
                    console.error('Failed to fetch performance records', e);
                  } finally {
                    setPerfLoading(false);
                  }
                };
                void fetchPerfRecords();
              }}
              isLoading={perfLoading}
            >
              <RefreshCw size={16} className="mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="bg-bg-surface/50 rounded-lg p-4">
          <MetricsLineChart
            records={perfRecords}
            timeRange={perfTimeRange}
            selectedMetrics={selectedPerfMetrics}
            loading={perfLoading}
            height={350}
          />
        </div>

        <div className="mt-4 text-xs text-text-muted">
          <p>Roll-down aggregation: Hour (1-min buckets) | Day (1-hour buckets) | Week/Month (1-day buckets)</p>
          <p className="mt-1">
            <span className="inline-flex items-center gap-1 mr-4">
              <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
              TPS: Tokens per second
            </span>
            <span className="inline-flex items-center gap-1 mr-4">
              <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
              TTFT: Time to first token
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
              Latency: Total request duration
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
};
