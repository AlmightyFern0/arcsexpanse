import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

/**
 * Rate limiter per il form contatti: max 5 invii / 10 minuti per chiave.
 * Lo stesso limiter si usa con due chiavi distinte, `ip:<ip>` e
 * `email:<hash>` (audit §12.2: per IP *e* per email).
 * Null se Upstash non è configurato (dev locale) → il chiamante salta il limite.
 */
export const contactRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      prefix: "ratelimit:contact",
      analytics: true,
    })
  : null;

/**
 * Tetto giornaliero per IP, sopra la finestra da 10 minuti: chi resta sotto
 * il limite breve ma insiste tutto il giorno brucerebbe comunque la quota
 * Resend (100 email/giorno sul piano gratuito).
 */
export const contactDailyRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(20, "1 d"),
      prefix: "ratelimit:contact-daily",
    })
  : null;

/**
 * Deduplica: true se lo stesso invio (hash di email + messaggio) e' gia'
 * arrivato negli ultimi `ttlSeconds`. Doppio click, refresh, bot che ripete.
 * Senza Upstash non deduplica (false).
 */
export async function isDuplicateSubmission(hash: string, ttlSeconds = 600): Promise<boolean> {
  if (!redis) return false;
  // SET NX: riesce solo la prima volta; le successive tornano null.
  const first = await redis.set(`contact:dedupe:${hash}`, 1, { nx: true, ex: ttlSeconds });
  return first === null;
}
