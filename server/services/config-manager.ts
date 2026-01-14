import { rename } from "node:fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import { parse, stringify } from "yaml";
import { PlexusConfigSchema, type PlexusConfig } from "../types/config";
import { logger } from "../utils/logger";
import { EventEmitter } from "./event-emitter";

export class ConfigManager {
  private configPath: string;
  private currentConfig: PlexusConfig;
  private eventEmitter: EventEmitter;

  constructor(configPath: string, currentConfig: PlexusConfig, eventEmitter: EventEmitter) {
    this.configPath = configPath;
    this.currentConfig = currentConfig;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Get raw config with metadata
   */
  async getConfig() {
    const file = Bun.file(this.configPath);
    const rawContent = await file.text();
    
    return {
      config: rawContent,
      lastModified: new Date(file.lastModified).toISOString(),
      checksum: this.calculateChecksum(rawContent),
    };
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfigYaml: string, validate = true, reload = true): Promise<{ previousChecksum: string; newChecksum: string }> {
    const current = await this.getConfig();

    // 1. Parse and Validate
    if (validate) {
      try {
        const parsed = parse(newConfigYaml);
        PlexusConfigSchema.parse(parsed);
      } catch (error) {
        throw new Error(`Invalid configuration: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 2. Write to temp file
    const tempPath = `${this.configPath}.tmp`;
    await Bun.write(tempPath, newConfigYaml);

    // 3. Atomic rename
    await rename(tempPath, this.configPath);

    // 4. Calculate new checksum
    const newChecksum = this.calculateChecksum(newConfigYaml);

    // 5. Emit change event
    this.eventEmitter.emitEvent("config_change", {
      previousChecksum: current.checksum,
      newChecksum,
      changedSections: this.detectChangedSections(current.config, newConfigYaml),
    });

    // 6. Reload if requested (In a real app, we might need to trigger a server restart or re-init services)
    if (reload) {
        // We rely on the file watcher in config.ts to pick this up, 
        // OR we can explicitly call a reload function if passed.
        // For this implementation, we assume the watcher or the caller handles the actual re-init.
        logger.info("Configuration updated via API");
    }

    return {
      previousChecksum: current.checksum,
      newChecksum,
    };
  }

  private calculateChecksum(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  private detectChangedSections(oldYaml: string, newYaml: string): string[] {
    try {
        const oldObj = parse(oldYaml);
        const newObj = parse(newYaml);
        const changes: string[] = [];

        for (const key of Object.keys(newObj)) {
            if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
                changes.push(key);
            }
        }
        return changes;
    } catch {
        return ["unknown"];
    }
  }
}
