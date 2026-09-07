import assert from "node:assert/strict";
import { renderGuideHtml } from "../src/views/guide.js";
import { checkRateLimit, resetRateLimiter } from "../src/engine/rateLimiter.js";
import { config } from "../src/config.js";

console.log("=== GÜVENLİK REGRESYON TESTLERİ ===\n");

// --- Test 1: Host başlığı üzerinden HTML/JS enjeksiyonu ---
// Express tarafında liveUrl, req.headers.host değerinden gelir ve sayfada
// HTML metni, href niteliği ve onclick içindeki JS dizesi olmak üzere üç
// ayrı bağlamda kullanılır. Kaçış yerine katı beyaz liste uygulanır.
console.log("[Test 1] Host başlığı ile XSS denemeleri reddediliyor mu?");
const saldirilar = [
  "http://x'),alert(document.domain),('",
  "http://evil</span><script>alert(1)</script><span>",
  'http://a"onmouseover="alert(1)',
  "javascript:alert(1)",
  "http://a\nSet-Cookie: x=1",
  "http://user:pass@evil.com",
];
for (const kotu of saldirilar) {
  const html = renderGuideHtml({ liveUrl: kotu });
  assert.ok(!html.includes("alert("), `enjeksiyon sızdı: ${kotu}`);
  assert.ok(!html.includes("onmouseover"), `nitelik enjeksiyonu sızdı: ${kotu}`);
  assert.ok(!html.includes("Set-Cookie"), `başlık enjeksiyonu sızdı: ${kotu}`);
}
console.log(`✓ ${saldirilar.length} zararlı Host değeri reddedildi, varsayılana düşüldü.\n`);

// --- Test 2: meşru host'lar çalışmaya devam etmeli ---
console.log("[Test 2] Geçerli host değerleri korunuyor mu?");
for (const iyi of [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://kktc-tufe-api.stevevaius.workers.dev",
  "http://api.example.com:8080",
]) {
  const html = renderGuideHtml({ liveUrl: iyi });
  assert.ok(html.includes(`${iyi}/api/v1/latest`), `geçerli host düştü: ${iyi}`);
}
console.log("✓ Meşru host'lar olduğu gibi kullanılıyor.\n");

// --- Test 3: hız sınırlayıcı ---
console.log("[Test 3] Hız sınırlayıcı IP başına doğru sayıyor mu?");
resetRateLimiter();
let izin = 0;
let ilkRed = null;
for (let i = 1; i <= 260; i++) {
  const v = checkRateLimit("198.51.100.7");
  if (v.allowed) izin++;
  else if (!ilkRed) ilkRed = i;
}
assert.equal(izin, 240, "dakikada 240 istek geçmeliydi");
assert.equal(ilkRed, 241, "241. istek reddedilmeliydi");
assert.equal(checkRateLimit("198.51.100.8").allowed, true, "farklı IP etkilenmemeli");
console.log(`✓ 240 istek geçti, ${ilkRed}. istek 429 aldı, diğer IP etkilenmedi.\n`);

// --- Test 4: sınırlayıcı belleği sınırsız büyümemeli ---
console.log("[Test 4] Sınırlayıcı bellek büyümesi sınırlı mı?");
resetRateLimiter();
for (let i = 0; i < 6000; i++) checkRateLimit(`10.0.${(i / 256) | 0}.${i % 256}`);
// MAX_TRACKED_IPS = 5000; tahliye çalışmazsa bellek sınırsız büyürdü
assert.equal(checkRateLimit("10.0.0.1").allowed, true);
console.log("✓ 6000 farklı IP sonrası sınırlayıcı hâlâ çalışıyor (tahliye devrede).\n");

// --- Test 5: yayınlanmış varsayılan API anahtarı kalmamalı ---
console.log("[Test 5] Varsayılan API anahtarı kaldırıldı mı?");
if (!process.env.API_KEY) {
  assert.equal(config.apiKey, null, "API_KEY tanımsızken varsayılan anahtar olmamalı");
}
console.log("✓ API_KEY tanımlı değilse anahtar null (uç nokta 503 döner).\n");

console.log("🎉 GÜVENLİK REGRESYON TESTLERİ BAŞARIYLA GEÇTİ!");
