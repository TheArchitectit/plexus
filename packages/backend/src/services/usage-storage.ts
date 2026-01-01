import { Database } from "bun:sqlite";
import { logger } from "../utils/logger";
import { UsageRecord } from "../types/usage";
import fs from 'node:fs';
import path from 'node:path';

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
}
