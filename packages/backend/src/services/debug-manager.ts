import { UsageStorageService } from './usage-storage';
import { logger } from '../utils/logger';
import { StreamReconstructor } from '../utils/stream-reconstructor';

export interface DebugLogRecord {
    requestId: string;
    rawRequest?: any;
    transformedRequest?: any;
    rawResponse?: any;
    transformedResponse?: any;
    rawResponseSnapshot?: any;
    transformedResponseSnapshot?: any;
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

        // Auto-cleanup after 5 minutes to prevent memory leaks if streams hang or fail to flush
        setTimeout(() => {
            if (this.pendingLogs.has(requestId)) {
                logger.debug(`Auto-flushing stale debug log for ${requestId}`);
                this.flush(requestId);
            }
        }, 5 * 60 * 1000);
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
    
    // Create a TransformStream to observe and log data passing through
    createDebugObserver(requestId: string, type: 'rawResponse' | 'transformedResponse'): TransformStream {
        const decoder = new TextDecoder();
        let accumulated = '';

        return new TransformStream({
            transform: (chunk, controller) => {
                // Pass chunk through immediately
                controller.enqueue(chunk);

                if (!this.enabled) return;
                
                // Accumulate for logging
                try {
                    if (typeof chunk === 'string') {
                        accumulated += chunk;
                    } else if (chunk instanceof Uint8Array) {
                        accumulated += decoder.decode(chunk, { stream: true });
                    } else {
                        // Try to stringify if it's an object
                        try {
                            accumulated += JSON.stringify(chunk) + '\n';
                        } catch (e) {
                            accumulated += String(chunk);
                        }
                    }

                    // Update pending log in memory
                    const log = this.pendingLogs.get(requestId);
                    if (log) {
                        log[type] = accumulated;
                    }
                } catch (e) {
                    // Ignore logging errors to prevent impacting the stream
                }
            },
            flush: () => {
                if (!this.enabled) return;
                
                // Final decode if there are trailing bytes
                try {
                    accumulated += decoder.decode();
                    const log = this.pendingLogs.get(requestId);
                    if (log) {
                        log[type] = accumulated;
                        if (type === 'transformedResponse') {
                            this.flush(requestId);
                        }
                    }
                } catch (e) {
                    logger.error(`Error finalizing debug stream for ${requestId}`, e);
                }
            }
        });
    }

    flush(requestId: string) {
        if (!this.storage) return;
        const log = this.pendingLogs.get(requestId);
        if (log) {
            // Attempt to reconstruct streams if they exist and appear to be SSE
            if (typeof log.rawResponse === 'string' && log.rawResponse.includes('data: ')) {
                log.rawResponseSnapshot = StreamReconstructor.reconstruct(log.rawResponse);
            }
            if (typeof log.transformedResponse === 'string' && log.transformedResponse.includes('data: ')) {
                log.transformedResponseSnapshot = StreamReconstructor.reconstruct(log.transformedResponse);
            }

            this.storage.saveDebugLog(log);
            this.pendingLogs.delete(requestId);
        }
    }
}
