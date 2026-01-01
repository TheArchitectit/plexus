export class StreamReconstructor {
    static reconstruct(streamData: string): object | null {
        if (!streamData) return null;
        
        const chunks: any[] = [];
        const lines = streamData.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            
            if (trimmed.startsWith('data: ')) {
                try {
                    const json = JSON.parse(trimmed.substring(6));
                    chunks.push(json);
                } catch (e) {
                    // ignore non-json data lines
                }
            }
        }

        if (chunks.length === 0) return null;

        // Deep merge chunks
        return chunks.reduce((acc, chunk) => this.merge(acc, chunk), {});
    }

    private static merge(target: any, source: any): any {
        if (target === null || target === undefined) return source;
        if (source === null || source === undefined) return source; // Source null doesn't overwrite target usually, but in merge usually source wins? 
        // If source is null, it might mean "clear". But in streams, null often means "no change" or "not set".
        // Let's assume if source is explicitly null, we keep target? 
        // Or if target is object and source is null?
        // Let's stick to simple overwrite if types mismatch or primitives.

        const targetType = typeof target;
        const sourceType = typeof source;

        if (targetType !== sourceType) return source;

        // Handle Array
        if (Array.isArray(target) && Array.isArray(source)) {
            const result = [...target];
            source.forEach((item, index) => {
                if (index < result.length) {
                    result[index] = this.merge(result[index], item);
                } else {
                    result.push(item);
                }
            });
            return result;
        }

        // Handle Object
        if (targetType === 'object' && !Array.isArray(target)) {
            const result = { ...target };
            for (const key in source) {
                if (key in result) {
                    result[key] = this.merge(result[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
            return result;
        }

        // Handle String (Concatenate)
        if (targetType === 'string') {
             // Heuristic: Concatenate if not identical
             if (target !== source) {
                 return target + source;
             }
             return target;
        }

        // Default: Source overwrites (numbers, booleans)
        return source;
    }
}
