import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

interface ErrorLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
  type?: string;
  errorType?: string;
  errorMessage?: string;
  httpStatus?: number;
  clientIp?: string;
  apiKey?: string;
  apiType?: string;
  requestedModel?: string;
  provider?: string;
  model?: string;
  requestBody?: unknown;
  providerResponse?: unknown;
}

export function ErrorsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const response = await api.queryLogs({ type: 'error', limit: 50 });

      if (response.entries && response.entries.length > 0) {
        const typedErrors = response.entries as unknown as ErrorLog[];
        setErrors(typedErrors);
      } else {
        setErrors([]);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchErrorDetails = async (id: string) => {
    try {
      const response = await api.getLogDetails(id);
      if (response.errors && response.errors.length > 0) {
        const apiError = response.errors[0];
        if (!apiError) return;

        const error: ErrorLog = {
          id: (apiError.id as unknown) as string,
          timestamp: (apiError.timestamp as unknown) as string,
          message: apiError.errorMessage || '',
          stack: apiError.stackTrace,
          type: apiError.errorType,
          errorType: apiError.errorType,
          errorMessage: apiError.errorMessage,
          httpStatus: apiError.httpStatus,
          clientIp: apiError.clientIp,
          apiKey: apiError.apiKey,
          apiType: apiError.apiType,
          requestedModel: apiError.requestedModel,
          provider: apiError.provider,
          model: apiError.model,
          details: apiError as unknown as Record<string, unknown>
        };
        setSelectedError(error);
      }
    } catch (error) {
      console.error('Failed to fetch error details:', error);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  const handleDeleteError = async () => {
    if (selectedError) {
      try {
        await api.deleteLogs({ type: 'error', all: true });
        setSelectedError(null);
        await fetchErrors();
      } catch (error) {
        console.error('Failed to delete error:', error);
      }
    }
    setDeleteDialogOpen(false);
  };

  const handleDeleteAllErrors = async () => {
    try {
      await api.deleteLogs({ type: 'error', all: true });
      setSelectedError(null);
      await fetchErrors();
    } catch (error) {
      console.error('Failed to delete all errors:', error);
    }
    setDeleteAllDialogOpen(false);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const formatContent = (data: unknown): string => {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return data;
      }
    }
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Errors</h1>
          <p className="text-muted-foreground">
            View and investigate error logs and stack traces
          </p>
        </div>
        <Dialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete All Errors</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete all error logs? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteAllDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteAllErrors}>
                Delete All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-60px)]">
        <div className="lg:col-span-1 bg-card border rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium">Error Logs</span>
              <Badge variant="destructive" className="ml-auto">
                {errors.length}
              </Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : errors.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No errors found</div>
            ) : (
              <div className="divide-y">
                {errors.map((error) => (
                  <div
                    key={error.id}
                    className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                      selectedError?.id === error.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => fetchErrorDetails(error.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm truncate">{error.id}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {error.errorMessage || error.message}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </Badge>
                    </div>
                    {error.httpStatus && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="destructive" className="text-xs">
                          {error.httpStatus}
                        </Badge>
                        {error.errorType && (
                          <Badge variant="secondary" className="text-xs">
                            {error.errorType}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-card border rounded-lg overflow-hidden flex flex-col">
          {selectedError ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="font-semibold">{selectedError.id}</h2>
                      {selectedError.httpStatus && (
                        <Badge variant="destructive">{selectedError.httpStatus}</Badge>
                      )}
                      {selectedError.errorType && (
                        <Badge variant="outline">{selectedError.errorType}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedError.timestamp).toLocaleString()}
                    </p>
                  </div>
                <div className="flex gap-2">
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Error Log</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete this error log?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteError}>
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {selectedError.httpStatus && (
                  <Badge variant="destructive" className="mb-4">
                    {selectedError.httpStatus.toString()}
                  </Badge>
                )}

                <div className="mb-6 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
                  <h3 className="text-lg font-semibold text-destructive mb-2">{selectedError.errorType || 'Error'}</h3>
                  <p className="font-mono text-sm">{selectedError.errorMessage || selectedError.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Requested Model</p>
                    <Badge variant="outline" className="font-mono">
                      {selectedError.requestedModel || 'N/A'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Model</p>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {selectedError.model || 'N/A'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Provider</p>
                    <Badge variant="outline">
                      {selectedError.provider || 'N/A'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">API Type</p>
                    <Badge variant="secondary">
                      {selectedError.apiType || 'N/A'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Client IP</p>
                    <code className="px-2 py-1 bg-muted rounded text-sm">
                      {selectedError.clientIp || 'N/A'}
                    </code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">API Key</p>
                    <code className="px-2 py-1 bg-muted rounded text-sm">
                      {selectedError.apiKey || 'N/A'}
                    </code>
                  </div>
                </div>

                {selectedError.stack && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Stack Trace</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedError.stack || '')}
                      >
                        Copy
                      </Button>
                    </div>
                    <pre className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                      {selectedError.stack}
                    </pre>
                  </div>
                )}

                {(selectedError as any).requestBody && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Request Body</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(formatContent((selectedError as any).requestBody))}
                      >
                        Copy
                      </Button>
                    </div>
                    <pre className="p-4 bg-muted rounded-lg font-mono text-sm max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                      {formatContent((selectedError as any).requestBody)}
                    </pre>
                  </div>
                )}

                {(selectedError as any).providerResponse && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Provider Response</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(formatContent((selectedError as any).providerResponse))}
                      >
                        Copy
                      </Button>
                    </div>
                    <pre className="p-4 bg-muted rounded-lg font-mono text-sm max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                      {formatContent((selectedError as any).providerResponse)}
                    </pre>
                  </div>
                )}

                {selectedError.details && !(selectedError as any).requestBody && !(selectedError as any).providerResponse && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Additional Details</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(formatContent(selectedError.details))}
                      >
                        Copy
                      </Button>
                    </div>
                    <pre className="p-4 bg-muted rounded-lg font-mono text-sm max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                      {formatContent(selectedError.details)}
                    </pre>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Request ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs">{selectedError.id}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedError.id)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">
                Select an error from the list to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
