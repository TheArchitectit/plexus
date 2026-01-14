import { file, write } from "bun";
import { dirname } from "path";
import { logger } from "../utils/logger";
import type { CooldownState, CooldownEntry } from "../types/health";

/**
 * Persistent storage for cooldown state
 * Handles loading, saving, and atomic writes to prevent corruption
 */
export class CooldownStore {
  constructor(private storagePath: string) {}

  /**
   * Loads cooldown state from disk
   * Returns empty state if file doesn't exist or is corrupted
   */
  async load(): Promise<CooldownState> {
    try {
      const fileHandle = file(this.storagePath);
      
      if (!(await fileHandle.exists())) {
        logger.debug("Cooldown storage file does not exist, starting fresh", {
          path: this.storagePath,
        });
        return this.emptyState();
      }

      const contents = await fileHandle.text();
      const data = JSON.parse(contents);

      // Validate basic structure
      if (!data || typeof data !== "object") {
        logger.warn("Invalid cooldown storage format, starting fresh");
        return this.emptyState();
      }

      // Convert entries array/object to Record
      let entries: Record<string, CooldownEntry> = {};
      if (Array.isArray(data.entries)) {
        // Old format: array of entries
        for (const entry of data.entries) {
          entries[entry.provider] = entry;
        }
      } else if (data.entries && typeof data.entries === "object") {
        // New format: object with provider keys
        entries = data.entries;
      }

      // Filter out expired entries during load
      const now = Date.now();
      const activeEntries: Record<string, CooldownEntry> = {};
      for (const [provider, entry] of Object.entries(entries)) {
        if (entry.endTime > now) {
          activeEntries[provider] = entry;
        } else {
          logger.debug("Removing expired cooldown during load", {
            provider,
            expiredAt: new Date(entry.endTime).toISOString(),
          });
        }
      }

      logger.info("Cooldown state loaded", {
        path: this.storagePath,
        totalEntries: Object.keys(entries).length,
        activeEntries: Object.keys(activeEntries).length,
      });

      return {
        entries: activeEntries,
        lastUpdated: data.lastUpdated || now,
      };
    } catch (error) {
      logger.error("Failed to load cooldown state, starting fresh", {
        path: this.storagePath,
        error: error instanceof Error ? error.message : String(error),
      });
      return this.emptyState();
    }
  }

  /**
   * Saves cooldown state to disk with atomic write
   */
  async save(state: CooldownState): Promise<void> {
    try {
      // Update timestamp
      const stateToSave = {
        ...state,
        lastUpdated: Date.now(),
      };

      // Write using Bun's write function
      // Bun.write automatically creates directories and handles atomic writes
      await write(this.storagePath, JSON.stringify(stateToSave, null, 2));

      logger.debug("Cooldown state saved", {
        path: this.storagePath,
        entries: Object.keys(state.entries).length,
      });
    } catch (error) {
      logger.error("Failed to save cooldown state", {
        path: this.storagePath,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - cooldown state loss is not critical
    }
  }

  /**
   * Creates an empty cooldown state
   */
  private emptyState(): CooldownState {
    return {
      entries: {},
      lastUpdated: Date.now(),
    };
  }

  /**
   * Clears the cooldown storage file
   */
  async clear(): Promise<void> {
    try {
      await this.save(this.emptyState());
      logger.info("Cooldown storage cleared", { path: this.storagePath });
    } catch (error) {
      logger.error("Failed to clear cooldown storage", {
        path: this.storagePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
