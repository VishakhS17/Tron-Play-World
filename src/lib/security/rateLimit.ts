import { RateLimiterMemory } from "rate-limiter-flexible";

const limiter = new RateLimiterMemory({
  points: 20, // default points
  duration: 60, // per 60 seconds
});

const strictLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

export async function rateLimit(key: string, points = 1) {
  await limiter.consume(key, points);
}

export async function rateLimitStrict(key: string, points = 1) {
  await strictLimiter.consume(key, points);
}

