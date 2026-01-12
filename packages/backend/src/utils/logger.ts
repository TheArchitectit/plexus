import type { LoggingConfig } from "../types/config";

type LogLevel = "silly" | "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  component?: string;
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel = "info";
  private context: LogContext = {};

  private readonly levels: Record<LogLevel, number> = {
    silly: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
  };

  configure(config: LoggingConfig): void {
    this.level = config.level;
  }

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.level = this.level;
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, meta?: object): string {
    const timestamp = new Date().toISOString();
    const logObject = {
      timestamp,
      level,
      message,
      ...this.context,
      ...meta,
    };

    // Use JSON format for structured logging
    return JSON.stringify(logObject);
  }

  silly(message: string, meta?: object): void {
    if (this.shouldLog("silly")) {
      console.log(this.formatMessage("silly", message, meta));
    }
  }

  debug(message: string, meta?: object): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("debug", message, meta));
    }
  }

  info(message: string, meta?: object): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message, meta));
    }
  }

  warn(message: string, meta?: object): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  error(message: string, meta?: object): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, meta));
    }
  }
}

// Export singleton instance
export const logger = new Logger();
