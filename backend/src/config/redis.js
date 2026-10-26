import { Redis as UpstashRedis } from "@upstash/redis";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config({ override: true });

let redisClient = null;
let clientType = null;

// Redact credentials, tokens, or connection strings from logs and error messages
export function sanitizeError(message) {
  if (message === null || message === undefined) return "";
  let str = typeof message === "string" ? message : String(message);

  // Redact Upstash token if present in environment
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashToken && upstashToken.length > 4) {
    str = str.split(upstashToken).join("***");
  }

  // Redact redis:// and rediss:// passwords
  str = str.replace(/(rediss?:\/\/(?:[^:]*:)?).*@([a-zA-Z0-9.-]+(?::\d+)?)/gi, "$1***@$2");

  // Redact Authorization headers or Bearer tokens in text
  str = str.replace(/Bearer\s+[a-zA-Z0-9_\-.]+/gi, "Bearer ***");

  return str;
}

// Inspect current Redis environment variables
export function getRedisCredentials() {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const redisUrl = process.env.REDIS_URL?.trim();

  const isUpstashRest = Boolean(restUrl && restToken);
  const isIoRedis = Boolean(!isUpstashRest && redisUrl);

  return {
    hasRestUrl: Boolean(restUrl),
    hasRestToken: Boolean(restToken),
    hasRedisUrl: Boolean(redisUrl),
    isConfigured: isUpstashRest || isIoRedis,
    clientType: isUpstashRest ? "upstash-rest" : (isIoRedis ? "ioredis" : "none"),
  };
}

// Timeout helper to ensure network calls never hang indefinitely
export async function withTimeout(promise, ms = 4000, opName = "Redis operation") {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${opName} timed out after ${ms}ms`);
      err.name = "TimeoutError";
      reject(err);
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

// Create either Upstash REST client or ioredis client
function createRedisClient() {
  const { isConfigured, clientType: type } = getRedisCredentials();
  if (!isConfigured) return null;

  try {
    if (type === "upstash-rest") {
      const url = process.env.UPSTASH_REDIS_REST_URL.trim();
      const token = process.env.UPSTASH_REDIS_REST_TOKEN.trim();
      const client = new UpstashRedis({ url, token });
      clientType = "upstash-rest";
      return client;
    }

    if (type === "ioredis") {
      const url = process.env.REDIS_URL.trim();
      const isTls = url.startsWith("rediss://");
      const client = new Redis(url, {
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        lazyConnect: true,
        enableReadyCheck: true,
        ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 200, 1000);
        },
      });

      client.on("error", (err) => {
        console.warn("[Redis] Client error:", sanitizeError(err.message));
      });

      clientType = "ioredis";
      return client;
    }

    return null;
  } catch (err) {
    console.error("[Redis] Initialization failed:", sanitizeError(err.message));
    return null;
  }
}

// Get singleton Redis client or null if unconfigured
export function getRedisClient() {
  const creds = getRedisCredentials();
  if (!creds.isConfigured) {
    redisClient = null;
    clientType = null;
    return null;
  }

  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

// Perform a real Redis PING with timeout and safe status reporting
export async function checkRedisHealth({ timeoutMs = 4000 } = {}) {
  const creds = getRedisCredentials();

  if (!creds.isConfigured) {
    return {
      configured: false,
      healthy: false,
      status: "unconfigured",
      clientType: "none",
    };
  }

  const client = getRedisClient();
  if (!client) {
    return {
      configured: true,
      healthy: false,
      status: "initialization_failed",
      clientType: creds.clientType,
    };
  }

  const startTime = Date.now();
  try {
    if (creds.clientType === "ioredis" && client.status === "wait") {
      await withTimeout(client.connect(), timeoutMs, "Redis connect");
    }

    const pong = await withTimeout(client.ping(), timeoutMs, "Redis PING");
    const latencyMs = Date.now() - startTime;

    if (pong === "PONG") {
      return {
        configured: true,
        healthy: true,
        status: "connected",
        clientType: creds.clientType,
        latencyMs,
      };
    }

    return {
      configured: true,
      healthy: false,
      status: "unexpected_response",
      clientType: creds.clientType,
    };
  } catch (err) {
    const errorType = err.name === "TimeoutError"
      ? "timeout"
      : /unauthorized|auth|forbidden/i.test(err.message)
      ? "auth_failed"
      : "network_error";

    return {
      configured: true,
      healthy: false,
      status: "disconnected",
      errorType,
      clientType: creds.clientType,
      error: sanitizeError(err.message),
    };
  }
}

// Temporary key write, read, and delete test with short TTL
export async function testRedisOperations({ timeoutMs = 5000, ttlSeconds = 10 } = {}) {
  const client = getRedisClient();
  if (!client) {
    return {
      success: false,
      status: "unconfigured",
      error: "Redis client is not configured",
    };
  }

  const testKey = `trashtrack:test:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const testValue = `health-check-${Date.now()}`;
  const startTime = Date.now();

  try {
    const testWork = async () => {
      // 1. Write temporary key with short TTL
      if (clientType === "upstash-rest") {
        await client.set(testKey, testValue, { ex: ttlSeconds });
      } else {
        await client.set(testKey, testValue, "EX", ttlSeconds);
      }

      // 2. Read key back and verify integrity
      const retrieved = await client.get(testKey);
      if (retrieved !== testValue) {
        throw new Error("Value verification failed: read value did not match write value");
      }

      // 3. Delete temporary key
      await client.del(testKey);

      // 4. Confirm key deletion
      const afterDelete = await client.get(testKey);
      if (afterDelete !== null && afterDelete !== undefined) {
        throw new Error("Key cleanup failed: temporary key was not deleted");
      }

      return true;
    };

    await withTimeout(testWork(), timeoutMs, "Redis test key write/read/del");
    const elapsedMs = Date.now() - startTime;

    return {
      success: true,
      status: "passed",
      testKey,
      elapsedMs,
      ttlSeconds,
    };
  } catch (err) {
    // Attempt best-effort deletion of test key if anything threw
    try {
      await client.del(testKey);
    } catch {
      // ignore cleanup errors
    }

    return {
      success: false,
      status: "failed",
      testKey,
      error: sanitizeError(err.message),
    };
  }
}

// Graceful close for shutdown
export async function closeRedis() {
  if (redisClient) {
    try {
      if (clientType === "ioredis") {
        if (redisClient.status === "ready" || redisClient.status === "connecting") {
          await Promise.race([
            redisClient.quit(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500)),
          ]);
        } else {
          redisClient.disconnect();
        }
      }
    } catch {
      if (clientType === "ioredis") redisClient.disconnect();
    } finally {
      redisClient = null;
      clientType = null;
    }
  }
}

export default {
  getClient: getRedisClient,
  getCredentials: getRedisCredentials,
  checkHealth: checkRedisHealth,
  testOperations: testRedisOperations,
  close: closeRedis,
  sanitizeError,
};
