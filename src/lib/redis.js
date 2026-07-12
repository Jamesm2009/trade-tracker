import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// All trade tracker keys are prefixed with tt_ to avoid collision with mf_dashboard_cache
const PREFIX = 'tt_';

export function key(name) {
  return `${PREFIX}${name}`;
}

export default redis;
