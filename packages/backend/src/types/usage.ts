export interface UsageRecord {
    requestId: string;
    date: string; // ISO string
    sourceIp: string | null;
    apiKey: string | null;
    incomingApiType: string;
    provider: string | null;
    incomingModelAlias: string | null;
    selectedModelName: string | null;
    outgoingApiType: string | null;
    tokensInput: number | null;
    tokensOutput: number | null;
    tokensReasoning: number | null;
    tokensCached: number | null;
    startTime: number; // timestamp
    durationMs: number;
    isStreamed: boolean;
    responseStatus: string; // "success", "error", or "HTTP <code"
}
