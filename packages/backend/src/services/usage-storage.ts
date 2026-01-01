import { Database } from "bun:sqlite";
import { logger } from "../utils/logger";
import { UsageRecord } from "../types/usage";
import fs from 'node:fs';
import path from 'node:path';

export interface UsageFilters {
    startDate?: string;
    endDate?: string;
    incomingApiType?: string;
    provider?: string;
    incomingModelAlias?: string;
    selectedModelName?: string;
    outgoingApiType?: string;
    minDurationMs?: number;
    maxDurationMs?: number;
    responseStatus?: string;
}

export interface PaginationOptions {
    limit: number;
    offset: number;
}

export class UsageStorageService {
    private db: Database;

    constructor(connectionString?: string) {
        if (connectionString) {
            this.db = new Database(connectionString);
            this.init();
            return;
        }

        // Determine location
        let dbDir = process.env.DATA_DIR;

        if (!dbDir) {
             // Fallback to config directory logic
             // Check if we are in packages/backend (project root is ../../)
             const possibleRoot = path.resolve(process.cwd(), '../../');
             const localConfig = path.resolve(process.cwd(), 'config');
             
             if (fs.existsSync(path.join(possibleRoot, 'config', 'plexus.yaml'))) {
                 dbDir = path.join(possibleRoot, 'config');
             } else if (fs.existsSync(path.join(localConfig, 'plexus.yaml'))) {
                 dbDir = localConfig;
             } else {
                 // Fallback to local data dir if all else fails
                 dbDir = path.resolve(process.cwd(), 'data');
             }
        }
        
        // Ensure directory exists
        if (!fs.existsSync(dbDir)) {
            try {
                fs.mkdirSync(dbDir, { recursive: true });
            } catch (e) {
                 logger.error(`Failed to create data directory at ${dbDir}, falling back to local data/`, e);
                 dbDir = path.resolve(process.cwd(), 'data');
                 fs.mkdirSync(dbDir, { recursive: true });
            }
        }

        const dbPath = path.join(dbDir, "usage.sqlite");
        logger.info(`Initializing usage database at ${dbPath}`);
        
        this.db = new Database(dbPath);
        this.init();
    }

    getDb(): Database {
        return this.db;
    }

    private init() {
        try {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS request_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    request_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    source_ip TEXT,
                    api_key TEXT,
                    incoming_api_type TEXT,
                    provider TEXT,
                    incoming_model_alias TEXT,
                    selected_model_name TEXT,
                    outgoing_api_type TEXT,
                    tokens_input INTEGER,
                    tokens_output INTEGER,
                    tokens_reasoning INTEGER,
                    tokens_cached INTEGER,
                    start_time INTEGER,
                    duration_ms INTEGER,
                    is_streamed INTEGER,
                    response_status TEXT
                );
            `);
            logger.info("Usage storage initialized");
        } catch (error) {
            logger.error("Failed to initialize usage storage", error);
        }
    }

    saveRequest(record: UsageRecord) {
        try {
            const query = this.db.prepare(`
                INSERT INTO request_usage (
                    request_id, date, source_ip, api_key, incoming_api_type,
                    provider, incoming_model_alias, selected_model_name, outgoing_api_type,
                    tokens_input, tokens_output, tokens_reasoning, tokens_cached,
                    start_time, duration_ms, is_streamed, response_status
                ) VALUES (
                    $requestId, $date, $sourceIp, $apiKey, $incomingApiType,
                    $provider, $incomingModelAlias, $selectedModelName, $outgoingApiType,
                    $tokensInput, $tokensOutput, $tokensReasoning, $tokensCached,
                    $startTime, $durationMs, $isStreamed, $responseStatus
                )
            `);

            query.run({
                $requestId: record.requestId,
                $date: record.date,
                $sourceIp: record.sourceIp,
                $apiKey: record.apiKey,
                $incomingApiType: record.incomingApiType,
                $provider: record.provider,
                $incomingModelAlias: record.incomingModelAlias,
                $selectedModelName: record.selectedModelName,
                $outgoingApiType: record.outgoingApiType,
                $tokensInput: record.tokensInput,
                $tokensOutput: record.tokensOutput,
                $tokensReasoning: record.tokensReasoning,
                $tokensCached: record.tokensCached,
                $startTime: record.startTime,
                $durationMs: record.durationMs,
                $isStreamed: record.isStreamed ? 1 : 0,
                $responseStatus: record.responseStatus
            });
            
            logger.debug(`Usage record saved for request ${record.requestId}`);
        } catch (error) {
            logger.error("Failed to save usage record", error);
        }
    }

    getUsage(filters: UsageFilters, pagination: PaginationOptions): { data: UsageRecord[], total: number } {
        let queryStr = "SELECT * FROM request_usage WHERE 1=1";
        let countQueryStr = "SELECT COUNT(*) as count FROM request_usage WHERE 1=1";
        const params: any = {};

        if (filters.startDate) {
            queryStr += " AND date >= $startDate";
            countQueryStr += " AND date >= $startDate";
            params.$startDate = filters.startDate;
        }
        if (filters.endDate) {
            queryStr += " AND date <= $endDate";
            countQueryStr += " AND date <= $endDate";
            params.$endDate = filters.endDate;
        }
        if (filters.incomingApiType) {
            queryStr += " AND incoming_api_type = $incomingApiType";
            countQueryStr += " AND incoming_api_type = $incomingApiType";
            params.$incomingApiType = filters.incomingApiType;
        }
        if (filters.provider) {
            queryStr += " AND provider = $provider";
            countQueryStr += " AND provider = $provider";
            params.$provider = filters.provider;
        }
        if (filters.incomingModelAlias) {
            queryStr += " AND incoming_model_alias = $incomingModelAlias";
            countQueryStr += " AND incoming_model_alias = $incomingModelAlias";
            params.$incomingModelAlias = filters.incomingModelAlias;
        }
        if (filters.selectedModelName) {
            queryStr += " AND selected_model_name = $selectedModelName";
            countQueryStr += " AND selected_model_name = $selectedModelName";
            params.$selectedModelName = filters.selectedModelName;
        }
        if (filters.outgoingApiType) {
            queryStr += " AND outgoing_api_type = $outgoingApiType";
            countQueryStr += " AND outgoing_api_type = $outgoingApiType";
            params.$outgoingApiType = filters.outgoingApiType;
        }
        if (filters.minDurationMs !== undefined) {
            queryStr += " AND duration_ms >= $minDurationMs";
            countQueryStr += " AND duration_ms >= $minDurationMs";
            params.$minDurationMs = filters.minDurationMs;
        }
        if (filters.maxDurationMs !== undefined) {
            queryStr += " AND duration_ms <= $maxDurationMs";
            countQueryStr += " AND duration_ms <= $maxDurationMs";
            params.$maxDurationMs = filters.maxDurationMs;
        }
        if (filters.responseStatus) {
            queryStr += " AND response_status = $responseStatus";
            countQueryStr += " AND response_status = $responseStatus";
            params.$responseStatus = filters.responseStatus;
        }

        queryStr += " ORDER BY date DESC LIMIT $limit OFFSET $offset";
        
        const dataParams = { ...params, $limit: pagination.limit, $offset: pagination.offset };

        try {
            const countResult = this.db.query(countQueryStr).get(params) as { count: number };
            const dataResult = this.db.query(queryStr).all(dataParams) as any[];

            // Map snake_case to camelCase for UsageRecord
            const mappedData: UsageRecord[] = dataResult.map(row => ({
                requestId: row.request_id,
                date: row.date,
                sourceIp: row.source_ip,
                apiKey: row.api_key,
                incomingApiType: row.incoming_api_type,
                provider: row.provider,
                incomingModelAlias: row.incoming_model_alias,
                selectedModelName: row.selected_model_name,
                outgoingApiType: row.outgoing_api_type,
                tokensInput: row.tokens_input,
                tokensOutput: row.tokens_output,
                tokensReasoning: row.tokens_reasoning,
                tokensCached: row.tokens_cached,
                startTime: row.start_time,
                durationMs: row.duration_ms,
                isStreamed: !!row.is_streamed,
                responseStatus: row.response_status
            }));

            return {
                data: mappedData,
                total: countResult.count
            };
        } catch (error) {
            logger.error("Failed to query usage", error);
            throw error;
        }
    }
}
