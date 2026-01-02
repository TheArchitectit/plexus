import React, { useEffect, useState } from 'react';
import { api, InferenceError } from '../lib/api';
import Editor from '@monaco-editor/react';
import { RefreshCw, Clock, AlertTriangle, ChevronDown, ChevronRight, Copy, Check, Trash2, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useLocation } from 'react-router-dom';

export const Errors: React.FC = () => {
    const location = useLocation();
    const [errors, setErrors] = useState<InferenceError[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedError, setSelectedError] = useState<InferenceError | null>(null);
    const [loading, setLoading] = useState(false);

    // Delete Modal State
    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [isSingleDeleteModalOpen, setIsSingleDeleteModalOpen] = useState(false);
    const [selectedLogIdForDelete, setSelectedLogIdForDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (location.state?.requestId) {
            setSelectedId(location.state.requestId);
        }
    }, [location.state]);

    const fetchErrors = async () => {
        setLoading(true);
        try {
            const data = await api.getErrors(50);
            setErrors(data);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAll = () => {
        setIsDeleteAllModalOpen(true);
    };

    const confirmDeleteAll = async () => {
        setIsDeleting(true);
        try {
            await api.deleteAllErrors();
            await fetchErrors();
            setSelectedId(null);
            setSelectedError(null);
            setIsDeleteAllModalOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDelete = (e: React.MouseEvent, requestId: string) => {
        e.stopPropagation();
        setSelectedLogIdForDelete(requestId);
        setIsSingleDeleteModalOpen(true);
    };

    const confirmDeleteSingle = async () => {
        if (!selectedLogIdForDelete) return;
        setIsDeleting(true);
        try {
            await api.deleteError(selectedLogIdForDelete);
            setErrors(errors.filter(e => e.request_id !== selectedLogIdForDelete));
            if (selectedId === selectedLogIdForDelete) {
                setSelectedId(null);
                setSelectedError(null);
            }
            setIsSingleDeleteModalOpen(false);
            setSelectedLogIdForDelete(null);
        } catch (e) {
            console.error("Failed to delete error log", e);
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        fetchErrors();
        const interval = setInterval(fetchErrors, 10000); // Auto-refresh list
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedId) {
            const error = errors.find(e => e.request_id === selectedId);
            setSelectedError(error || null);
        } else {
            setSelectedError(null);
        }
    }, [selectedId, errors]);

    const formatContent = (content: any) => {
        if (!content) return '';
        if (typeof content === 'string') {
            try {
                return JSON.stringify(JSON.parse(content), null, 2);
            } catch {
                return content;
            }
        }
        return JSON.stringify(content, null, 2);
    };

    return (
        <div className="debug-page">
            <header className="debug-header">
                <div>
                    <h1 className="page-title text-red-500">Inference Errors</h1>
                    <p className="page-description">Inspect detailed error logs and backtraces</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleDeleteAll} variant="danger" className="flex items-center gap-2" disabled={errors.length === 0}>
                        <Trash2 size={16} />
                        Delete All
                    </Button>
                    <Button onClick={fetchErrors} variant="secondary" className="flex items-center gap-2">
                        <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </header>

            <div className="debug-content">
                {/* Left Pane: Error List */}
                <div className="debug-sidebar">
                    <div className="debug-list-header">
                        <span className="debug-list-title">
                            Recent Errors
                        </span>
                    </div>
                    <div className="debug-list">
                        {errors.map(error => (
                            <div 
                                key={error.request_id}
                                onClick={() => setSelectedId(error.request_id)}
                                className={clsx(
                                    "debug-list-item group",
                                    selectedId === error.request_id && "selected"
                                )}
                            >
                                <div className="debug-item-content w-full">
                                    <div className="debug-item-meta justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-[var(--color-text-muted)]" />
                                            <span className="debug-time">
                                                {new Date(error.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDelete(e, error.request_id)}
                                            className="debug-delete-btn group-hover-visible"
                                            title="Delete log"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <XCircle size={14} className="text-red-500 flex-shrink-0" />
                                        <div className="debug-id text-red-400 overflow-hidden text-ellipsis whitespace-nowrap">
                                            {error.error_message}
                                        </div>
                                    </div>
                                    <div className="text-xs text-[var(--color-text-muted)] mt-1 font-mono">
                                        {error.request_id.substring(0, 8)}...
                                    </div>
                                </div>
                            </div>
                        ))}
                        {errors.length === 0 && (
                            <div className="text-center p-8 text-[var(--color-text-muted)] italic text-sm">
                                No errors found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Details */}
                <div className="debug-main">
                    {selectedId && selectedError ? (
                        <div className="debug-accordion-container">
                             <AccordionPanel 
                                title="Error Message" 
                                content={selectedError.error_message} 
                                color="text-red-500"
                                defaultOpen={true}
                                language="plaintext"
                            />
                             <AccordionPanel 
                                title="Stack Trace" 
                                content={selectedError.error_stack || 'No stack trace available'} 
                                color="text-orange-400"
                                defaultOpen={true}
                                language="plaintext"
                            />
                             <AccordionPanel 
                                title="Additional Details" 
                                content={formatContent(selectedError.details)} 
                                color="text-blue-400"
                            />
                        </div>
                    ) : (
                        <div className="debug-empty">
                            <AlertTriangle size={48} opacity={0.2} className="text-red-500" />
                            <p>Select an error to inspect details</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal 
                isOpen={isDeleteAllModalOpen} 
                onClose={() => setIsDeleteAllModalOpen(false)}
                title="Confirm Deletion"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsDeleteAllModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDeleteAll} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete All Errors'}
                        </Button>
                    </>
                }
            >
                <p>Are you sure you want to delete ALL error logs? This action cannot be undone.</p>
            </Modal>

            <Modal 
                isOpen={isSingleDeleteModalOpen} 
                onClose={() => setIsSingleDeleteModalOpen(false)}
                title="Confirm Deletion"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsSingleDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDeleteSingle} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete Log'}
                        </Button>
                    </>
                }
            >
                <p>Are you sure you want to delete this error log? This action cannot be undone.</p>
            </Modal>
        </div>
    );
};

const AccordionPanel: React.FC<{ 
    title: string; 
    content: string; 
    color: string;
    defaultOpen?: boolean;
    language?: string;
}> = ({ title, content, color, defaultOpen = false, language = 'json' }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="debug-accordion-item">
            <div 
                className="debug-accordion-header" 
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className={clsx("debug-accordion-title", color)}>{title}</span>
                </div>
                <button 
                    className="debug-copy-btn"
                    onClick={handleCopy}
                    title="Copy to clipboard"
                >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
            </div>
            <div 
                className={clsx(
                    "debug-accordion-content",
                    isOpen ? "open" : "closed"
                )}
            >
                <div className="debug-editor-container">
                    <Editor 
                        height="100%" 
                        defaultLanguage={language} 
                        theme="vs-dark"
                        value={content} 
                        options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 12,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            lineNumbers: 'on',
                            folding: true,
                            wordWrap: 'on',
                            padding: { top: 10, bottom: 10 }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
