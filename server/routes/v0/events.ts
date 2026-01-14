import { EventEmitter } from "../../services/event-emitter";
import { logger } from "../../utils/logger";

export async function handleEvents(req: Request, eventEmitter: EventEmitter): Promise<Response> {
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  return new Response(new ReadableStream({
    start(controller) {
      try {
        logger.debug("Adding client to event emitter");
        eventEmitter.addClient(controller);
      } catch (error) {
        logger.error("Failed to add client", { error });
        controller.close();
      }
    },
    cancel(controller) {
        eventEmitter.removeClient(controller as any);
    },
  }), { headers });
}