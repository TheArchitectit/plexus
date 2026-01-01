import { expect, test, describe, mock } from "bun:test";
import { Router } from "../router";
import { CooldownManager } from "../cooldown-manager";

describe("Router Cooldowns", () => {
    const mockConfig = {
        providers: {
            "p1": { type: "OpenAI", api_base_url: "..." },
            "p2": { type: "Anthropic", api_base_url: "..." }
        },
        models: {
            "multi-model": {
                targets: [
                    { provider: "p1", model: "m1" },
                    { provider: "p2", model: "m2" }
                ]
            }
        }
    };

    mock.module("../../config", () => ({
        getConfig: () => mockConfig
    }));

    test("avoids cooled down provider", () => {
        const manager = CooldownManager.getInstance();
        manager.markProviderFailure("p1");
        
        // Should always pick p2
        for (let i = 0; i < 10; i++) {
             const route = Router.resolve("multi-model");
             expect(route.provider).toBe("p2");
        }
    });

    test("throws if all providers cooled down", () => {
        const manager = CooldownManager.getInstance();
        manager.markProviderFailure("p1");
        manager.markProviderFailure("p2");
        
        expect(() => Router.resolve("multi-model")).toThrow(/All providers for model alias/);
    });
});
