/**
 * Cloudflare Worker isolate'i icinde calisan basit hiz sinirlayici.
 *
 * KAPSAM NOTU: Sayac isolate belleginde tutulur, kuresel degildir. Ayni IP
 * farkli PoP'lara dagilirsa her biri kendi butcesini gorur. Bu bilincli bir
 * takas: kuresel dogruluk icin her istekte bir Durable Object gidis-donusu
 * gerekirdi, bu da her cagriya gecikme ve gunluk kota yuku eklerdi.
 *
 * Amac mukemmel kota degil, tek kaynaktan gelen asiri yuku kesmek; kotuye
 * kullanim zaten tek bir PoP uzerinden yogunlastigi icin pratikte calisir.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 240; // dakikada, IP basina
const MAX_TRACKED_IPS = 5_000; // bellegin sinirsiz buyumesini engeller

/** @type {Map<string, {count: number, resetAt: number}>} */
const buckets = new Map();

export function resetRateLimiter() {
  buckets.clear();
}

/**
 * Suresi dolmus kayitlari temizler; hala doluysa en eskiden baslayarak atar.
 * Map ekleme sirasini korudugu icin ilk anahtarlar en eski kayitlardir.
 */
function evictIfNeeded(now) {
  if (buckets.size < MAX_TRACKED_IPS) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  while (buckets.size >= MAX_TRACKED_IPS) {
    const oldest = buckets.keys().next();
    if (oldest.done) break;
    buckets.delete(oldest.value);
  }
}

/**
 * @param {string} clientId Genelde CF-Connecting-IP
 * @param {number} [now]
 * @returns {{allowed: boolean, remaining: number, retryAfterSeconds: number, limit: number}}
 */
export function checkRateLimit(clientId, now = Date.now()) {
  if (!clientId) {
    return { allowed: true, remaining: MAX_REQUESTS, retryAfterSeconds: 0, limit: MAX_REQUESTS };
  }

  let bucket = buckets.get(clientId);

  if (!bucket || bucket.resetAt <= now) {
    evictIfNeeded(now);
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(clientId, bucket);
  }

  bucket.count++;

  const allowed = bucket.count <= MAX_REQUESTS;
  return {
    allowed,
    remaining: Math.max(0, MAX_REQUESTS - bucket.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((bucket.resetAt - now) / 1000),
    limit: MAX_REQUESTS,
  };
}
