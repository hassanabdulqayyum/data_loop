import { createClient } from "redis";

/**
 * In test runs we don't want to connect to a real Redis instance because that would
 * require extra infrastructure. We therefore expose a small in-memory stub when
 * NODE_ENV === 'test'. In every other environment the real Redis client is used.
 */
let redisWrapper;

if (process.env.NODE_ENV === 'test') {
  /**
   * Lightweight in-memory stub that mimics the subset of the Redis client API
   * the app relies on (currently only `xAdd` and `quit`). This keeps the
   * production code unchanged while letting the test suite proceed without a
   * running Redis server.
   */
  const stub = {
    async xAdd() {
      /* no-op – we resolve immediately so awaiting code keeps working */
      return 'OK';
    },
    async quit() {
      /* no-op */
    },
  };
  redisWrapper = stub;
} else {
  // --- Production / development implementation -----------------------------
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('Environment variable REDIS_URL is undefined!');
  }

  // We create the client lazily so failing to connect crashes fast.
  const client = createClient({ url: redisUrl });
  (async () => {
    try {
      await client.connect();
      console.log('✅ Connected to Redis');
    } catch (err) {
      console.error('❌ Redis connection failed:', err);
      process.exit(1);
    }
  })();

  redisWrapper = {
    /** Proxy xAdd to the underlying Redis client. */
    async xAdd(...args) {
      return client.xAdd(...args);
    },
    async quit() {
      return client.quit();
    },
  };
}

export default redisWrapper;