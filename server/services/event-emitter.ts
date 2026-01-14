import { EventEmitter as NodeEventEmitter } from "events";
import { logger } from "../utils/logger";
import type { EventType, SSEEvent } from "../types/management";

export class EventEmitter extends NodeEventEmitter {
  private clients: Set<any> = new Set();
  private maxClients: number;
  private heartbeatInterval: number;
  private heartbeatTimer: Timer | null = null;

  constructor(maxClients = 10, heartbeatInterval = 30000) {
    super();
    this.maxClients = maxClients;
    this.heartbeatInterval = heartbeatInterval;
    
    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Add a new SSE client
   */
  addClient(controller: any): void {
    if (this.clients.size >= this.maxClients) {
      throw new Error("Too many clients connected");
    }

    this.clients.add(controller);
    logger.silly("SSE client connected", { totalClients: this.clients.size });

    // Send initial ping
    const heartbeatEvent = {
      type: "heartbeat",
      timestamp: new Date().toISOString(),
    };
    const heartbeatMessage = `event: heartbeat\ndata: ${JSON.stringify(heartbeatEvent)}\n\n`;
    this.sendToClient(controller, heartbeatMessage);
  }

  /**
   * Remove a client
   */
  removeClient(controller: ReadableStreamDirectController): void {
    this.clients.delete(controller);
    logger.silly("SSE client disconnected", { totalClients: this.clients.size });
  }

  /**
   * Broadcast an event to all connected clients
   */
  emitEvent(type: EventType, data: unknown): void {
    const event: SSEEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    const message = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
    logger.info("SSE emitting event", { type, clientCount: this.clients.size });

    for (const client of this.clients) {
      this.sendToClient(client, message);
    }
  }

  private sendToClient(controller: any, message: string) {
    try {
      if (typeof controller.write === 'function') {
        controller.write(message);
        if (typeof controller.flush === 'function') {
           controller.flush();
        }
      } else {
        controller.enqueue(new TextEncoder().encode(message));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('already closed') || errorMsg.includes('Invalid state')) {
        // Suppressed - client disconnected
      } else {
        logger.error("Error sending to client", {
          error: errorMsg,
          errorStack: error instanceof Error ? error.stack : undefined,
          clientCount: this.clients.size
        });
      }
      // Client likely disconnected
      this.removeClient(controller);
    }
  }

  private startHeartbeat() {
    logger.silly("Starting heartbeat timer", { interval: this.heartbeatInterval });
    this.heartbeatTimer = setInterval(() => {
      logger.silly("Heartbeat timer fired to clients", { clients: this.clients.size });
      if (this.clients.size > 0) {
        const heartbeatEvent = {
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        };
        const heartbeatMessage = `event: heartbeat\ndata: ${JSON.stringify(heartbeatEvent)}\n\n`;
        logger.silly("Heartbeat sending to clients", { clients: this.clients.size });
        for (const client of this.clients) {
          this.sendToClient(client, heartbeatMessage);
        }
      }
    }, this.heartbeatInterval);
  }

  public shutdown() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    for (const client of this.clients) {
      try {
        client.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    this.clients.clear();
  }
}
