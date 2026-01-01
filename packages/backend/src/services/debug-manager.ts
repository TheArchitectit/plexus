import { UsageStorageService } from './usage-storage';
import { logger } from '../utils/logger';

export interface DebugLogRecord {
    requestId: string;
    rawRequest?: any;
    transformedRequest?: any;
    rawResponse?: any;
    transformedResponse?: any;
    createdAt?: number;
}

export class DebugManager {
    private static instance: DebugManager;
    private storage: UsageStorageService | null = null;
    private enabled: boolean = false;
    private pendingLogs: Map<string, DebugLogRecord> = new Map();

    private constructor() {}

    static getInstance(): DebugManager {
        if (!DebugManager.instance) {
            DebugManager.instance = new DebugManager();
        }
        return DebugManager.instance;
    }

    setStorage(storage: UsageStorageService) {
        this.storage = storage;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        logger.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    startLog(requestId: string, rawRequest: any) {
        if (!this.enabled) return;
        this.pendingLogs.set(requestId, {
            requestId,
            rawRequest,
            createdAt: Date.now()
        });
    }

    addTransformedRequest(requestId: string, payload: any) {
        if (!this.enabled) return;
        const log = this.pendingLogs.get(requestId);
        if (log) {
            log.transformedRequest = payload;
        }
    }

    addRawResponse(requestId: string, payload: any) {
        if (!this.enabled) return;
        const log = this.pendingLogs.get(requestId);
        if (log) {
            log.rawResponse = payload;
        }
    }

    addTransformedResponse(requestId: string, payload: any) {
        if (!this.enabled) return;
        const log = this.pendingLogs.get(requestId);
        if (log) {
            log.transformedResponse = payload;
            this.flush(requestId); // Assuming this is the last step
        }
    }
    
    // For streaming, we accumulate chunks
    captureStream(requestId: string, stream: ReadableStream, type: 'rawResponse' | 'transformedResponse') {
        if (!this.enabled) return;
        const log = this.pendingLogs.get(requestId);
        if (!log) return;

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        (async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    if (typeof value === 'string') {
                        accumulated += value;
                    } else if (value instanceof Uint8Array) {
                        accumulated += decoder.decode(value, { stream: true });
                    } else {
                        // Try to stringify if it's an object (like UnifiedChatStreamChunk)
                        try {
                            accumulated += JSON.stringify(value) + '\n';
                        } catch (e) {
                            accumulated += String(value);
                        }
                    }
                }
                // Flush remaining
                accumulated += decoder.decode();

                // Update log
                const currentLog = this.pendingLogs.get(requestId);
                if (currentLog) {
                    currentLog[type] = accumulated;
                    // If both responses are done (or if we are finishing up), we might want to flush.
                    // But identifying when *both* streams are done is tricky without a counter.
                    // For now, let's rely on explicit finish or just update memory.
                    // Actually, 'transformedResponse' stream end usually marks the end of request processing.
                    if (type === 'transformedResponse') {
                        this.flush(requestId);
                    }
                }
            } catch (e) {
                logger.error(`Error capturing debug stream for ${requestId}`, e);
            }
        })();
    }

    flush(requestId: string) {
        if (!this.storage) return;
        const log = this.pendingLogs.get(requestId);
        if (log) {
            this.storage.saveDebugLog(log);
            this.pendingLogs.delete(requestId);
        }
    }
}
