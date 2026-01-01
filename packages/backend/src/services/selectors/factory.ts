import { Selector } from './base';
import { RandomSelector } from './random';

export class SelectorFactory {
  static getSelector(type?: string): Selector {
    switch (type) {
      case 'random':
      case undefined:
      case null:
        return new RandomSelector();
      case 'cost':
        // Placeholder for future implementation
        throw new Error("Selector 'cost' not implemented yet");
      case 'latency':
        // Placeholder for future implementation
        throw new Error("Selector 'latency' not implemented yet");
      case 'usage':
        // Placeholder for future implementation
        throw new Error("Selector 'usage' not implemented yet");
      default:
        throw new Error(`Unknown selector type: ${type}`);
    }
  }
}
