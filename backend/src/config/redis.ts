import { createClient } from "redis";

export const redisClient = createClient({
    url: "redis://localhost:6379"
});

redisClient.on("error", (error) => {
    console.error("Redis error:", error);
});

redisClient.on("connect", () => {
    console.log("Connected to Redis");
});

redisClient.on("ready", () => {
    console.log("Redis is ready");
});