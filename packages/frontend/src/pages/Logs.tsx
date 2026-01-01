import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api, UsageRecord } from '../lib/api';
import { ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';

export const Logs = () => {
    const [logs, setLogs] = useState<UsageRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [limit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [newestLogId, setNewestLogId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        incomingModelAlias: '',
        provider: ''
    });

    const filtersRef = useRef(filters);

    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const cleanFilters: Record<string, any> = {};
            if (filters.incomingModelAlias) cleanFilters.incomingModelAlias = filters.incomingModelAlias;
            if (filters.provider) cleanFilters.provider = filters.provider;

            const res = await api.getLogs(limit, offset, cleanFilters);
            setLogs(res.data);
            setTotal(res.total);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, [offset, limit]); // Refresh when page changes

    useEffect(() => {
        if (offset !== 0) return;

        const es = new EventSource('/v0/management/events');
        
        es.addEventListener('log', (event: MessageEvent) => {
            try {
                const newLog = JSON.parse(event.data);
                const currentFilters = filtersRef.current;
                
                // Client-side filtering to match server-side LIKE behavior
                let matches = true;
                if (currentFilters.incomingModelAlias && 
                    !newLog.incomingModelAlias?.toLowerCase().includes(currentFilters.incomingModelAlias.toLowerCase())) {
                    matches = false;
                }
                if (currentFilters.provider && 
                    !newLog.provider?.toLowerCase().includes(currentFilters.provider.toLowerCase())) {
                    matches = false;
                }

                if (matches) {
                    setLogs(prev => {
                        // Prevent duplicates if multiple events fire (though unlikely with unique IDs, simple check helps)
                        if (prev.some(l => l.requestId === newLog.requestId)) return prev;
                        
                        const updated = [newLog, ...prev];
                        if (updated.length > limit) return updated.slice(0, limit);
                        return updated;
                    });
                    setTotal(prev => prev + 1);
                    setNewestLogId(newLog.requestId);
                }
            } catch (e) {
                console.error("Failed to process log event", e);
            }
        });

        return () => {
            es.close();
        };
    }, [offset, limit]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setOffset(0); // Reset to first page
        loadLogs();
    };

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return (
        <div className="page-container">
            <div className="header">
                <div className="header-left">
                    <h1 className="page-title">Logs</h1>
                    <Badge status="neutral">{total} Records</Badge>
                </div>
            </div>

            <Card className="logs-card">
                <div className="table-controls">
                    <form onSubmit={handleSearch} className="search-form" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <div className="input-icon-wrapper" style={{ position: 'relative', width: '250px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                            <Input 
                                placeholder="Filter by Model..." 
                                value={filters.incomingModelAlias}
                                onChange={e => setFilters({...filters, incomingModelAlias: e.target.value})}
                                style={{ paddingLeft: '32px' }}
                            />
                        </div>
                        <div className="input-icon-wrapper" style={{ position: 'relative', width: '200px' }}>
                             <Filter size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                             <Input 
                                placeholder="Filter by Provider..." 
                                value={filters.provider}
                                onChange={e => setFilters({...filters, provider: e.target.value})}
                                style={{ paddingLeft: '32px' }}
                            />
                        </div>
                        <Button type="submit" variant="primary">Search</Button>
                    </form>
                </div>

                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                                <th style={{ padding: '12px' }}>Request ID</th>
                                <th style={{ padding: '12px' }}>Date</th>
                                <th style={{ padding: '12px' }}>Source IP</th>
                                <th style={{ padding: '12px' }}>API Key</th>
                                <th style={{ padding: '12px' }}>API (In/Out)</th>
                                <th style={{ padding: '12px' }}>Model (In/Sel)</th>
                                <th style={{ padding: '12px' }}>Provider</th>
                                <th style={{ padding: '12px' }}>Tokens (I/O/R/C)</th>
                                <th style={{ padding: '12px' }}>Duration</th>
                                <th style={{ padding: '12px' }}>Streamed</th>
                                <th style={{ padding: '12px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={11} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={11} style={{ padding: '20px', textAlign: 'center' }}>No logs found</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr 
                                        key={log.requestId} 
                                        style={{ borderBottom: '1px solid var(--color-border-light)' }}
                                        className={log.requestId === newestLogId ? 'animate-pulse-fade' : ''}
                                    >
                                        <td style={{ padding: '12px' }} title={log.requestId}>
                                            {log.requestId.substring(0, 8)}...
                                        </td>
                                        <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                                            {new Date(log.date).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px' }}>{log.sourceIp || '-'}</td>
                                        <td style={{ padding: '12px' }}>{log.apiKey || '-'}</td>
                                        <td style={{ padding: '12px' }}>
                                            {log.incomingApiType || '?'} / {log.outgoingApiType || '?'}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                <span>REQ: {log.incomingModelAlias || '-'}</span>
                                                <span style={{color:'var(--color-text-secondary)', fontSize:'0.9em'}}>SEL: {log.selectedModelName || '-'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>{log.provider || '-'}</td>
                                        <td style={{ padding: '12px' }}>
                                            {log.tokensInput || 0} / {log.tokensOutput || 0} / {log.tokensReasoning || 0} / {log.tokensCached || 0}
                                        </td>
                                        <td style={{ padding: '12px' }}>{log.durationMs}ms</td>
                                        <td style={{ padding: '12px' }}>{log.isStreamed ? 'Yes' : 'No'}</td>
                                        <td style={{ padding: '12px' }}>
                                            <Badge status={log.responseStatus === 'success' ? 'connected' : 'error'}>
                                                {log.responseStatus}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pagination" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '20px', gap: '10px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                        Page {currentPage} of {Math.max(1, totalPages)}
                    </span>
                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px' }}>
                        <Button 
                            variant="secondary" 
                            disabled={offset === 0}
                            onClick={() => setOffset(Math.max(0, offset - limit))}
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button 
                            variant="secondary" 
                            disabled={offset + limit >= total}
                            onClick={() => setOffset(offset + limit)}
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
