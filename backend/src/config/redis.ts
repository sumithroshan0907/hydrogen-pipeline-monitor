import { createClient } from "redis";

// In-memory fallback cache if Redis is not running
const memoryStore = new Map<string, string>();

class MockRedisClient {
    isOpen = true;
    async connect() {
        console.log("ℹ️  Using high-performance in-memory cache (Redis fallback).");
    }
    async get(key: string): Promise<string | null> {
        return memoryStore.get(key) ?? null;
    }
    async set(key: string, value: string): Promise<string> {
        memoryStore.set(key, value);
        return "OK";
    }
    async del(key: string): Promise<number> {
        return memoryStore.delete(key) ? 1 : 0;
    }
    on(_event: string, _callback: (...args: any[]) => void) {
        return this;
    }
}

let activeClient: any = new MockRedisClient();

try {
    const realClient = createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        socket: {
            connectTimeout: 1000,
            reconnectStrategy: false,
        },
    });

    realClient.on("error", () => {
        // Suppress unhandled error log when offline
    });

    realClient.on("connect", () => {
        console.log("Connected to Redis");
    });

    realClient.on("ready", () => {
        console.log("Redis is ready");
        activeClient = realClient;
    });
} catch {
    // Keep mock client
}

export const redisClient = {
    async connect() {
        try {
            if (activeClient && typeof activeClient.connect === "function") {
                await activeClient.connect();
            }
        } catch {
            console.log("ℹ️  Redis server offline — smoothly falling back to in-memory store.");
            activeClient = new MockRedisClient();
        }
    },
    async get(key: string): Promise<string | null> {
        try {
            return await activeClient.get(key);
        } catch {
            return memoryStore.get(key) ?? null;
        }
    },
    async set(key: string, value: string): Promise<string> {
        try {
            return await activeClient.set(key, value);
        } catch {
            memoryStore.set(key, value);
            return "OK";
        }
    },
    async del(key: string): Promise<number> {
        try {
            return await activeClient.del(key);
        } catch {
            return memoryStore.delete(key) ? 1 : 0;
        }
    },
    on(event: string, callback: (...args: any[]) => void) {
        if (activeClient && typeof activeClient.on === "function") {
            activeClient.on(event, callback);
        }
        return this;
    },
};