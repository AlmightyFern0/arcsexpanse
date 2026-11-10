import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Rate limiter per il form contatti: max 5 invii / 10 minuti per IP.
 * Null se Upstash non è configurato (dev locale) → il chiamante salta il limite.
 */
export const contactRatelimit =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(5, "10 m"),
        prefix: "ratelimit:contact",
        analytics: true,
      })
    : null;
