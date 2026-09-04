import assert from "node:assert/strict";
import { track, flush, resetBuffer, bufferState } from "../src/engine/usageBuffer.js";
import { usageStore } from "../src/engine/usageStore.js";

console.log("=== KULLANIM SAYACI TESTLERİ ===\n");

/** Durable Object stub taklidi: RPC yerine çağrıları hafızada toplar. */
function makeFakeStub() {
  const applied = { counts: {}, days: {} };
  let calls = 0;
  return {
    calls: () => calls,
    applied,
    async record(batch) {
      calls++;
      // Gerçek RPC yalnızca serileştirilebilir veri kabul eder; burada da doğrula
      assert.equal(JSON.parse(JSON.stringify(batch)).counts !== undefined, true);
      for (const [k, v] of Object.entries(batch.counts)) {
        applied.counts[k] = (applied.counts[k] || 0) + v;
      }
      for (const [k, v] of Object.entries(batch.days)) {
        applied.days[k] = (applied.days[k] || 0) + v;
      }
      return { ok: true };
    },
  };
}

// --- Test 1: batch'teki nesneler serileştirilebilir olmalı ---
console.log("[Test 1] Batch nesneleri Workers RPC ile serileştirilebilir mi?");
resetBuffer();
const stub1 = makeFakeStub();
track("/api/v1/latest", stub1, undefined);
const { counts } = bufferState();
// Prototipsiz nesne Workers RPC'sinde "Could not serialize" hatası veriyordu
assert.equal(Object.getPrototypeOf(counts), Object.prototype);
await flush(stub1);
assert.equal(stub1.applied.counts["/api/v1/latest"], 1);
console.log("✓ Düz nesne kullanılıyor ve batch uygulandı.\n");

// --- Test 2: sayımlar birikir, kayıp olmaz ---
console.log("[Test 2] 25 istek eksiksiz sayılıyor mu?");
resetBuffer();
const stub2 = makeFakeStub();
const waits = [];
const ctx = { waitUntil: (p) => waits.push(p) };
for (let i = 0; i < 10; i++) track("/api/v1/latest", stub2, ctx);
for (let i = 0; i < 15; i++) track("/api/v1/tufe/:year", stub2, ctx);
await Promise.all(waits);
await flush(stub2);

const total = Object.values(stub2.applied.counts).reduce((a, b) => a + b, 0);
assert.equal(stub2.applied.counts["/api/v1/latest"], 10);
assert.equal(stub2.applied.counts["/api/v1/tufe/:year"], 15);
assert.equal(total, 25);
console.log(`✓ 25/25 istek sayıldı (${stub2.calls()} yazma çağrısıyla birleştirildi).\n`);

// --- Test 3: stub yoksa API bozulmamalı ---
console.log("[Test 3] Sayaç binding'i yokken hata veriyor mu?");
resetBuffer();
track("/api/v1/latest", undefined, undefined);
assert.equal(bufferState().pending, 1);
await flush(undefined); // patlamamalı
console.log("✓ Binding yokken sessizce tamponlanıyor, hata yok.\n");

// --- Test 4: DO yazma hatası isteği etkilememeli ---
console.log("[Test 4] Durable Object hata verirse yutuluyor mu?");
resetBuffer();
const brokenStub = { async record() { throw new Error("DO patladı"); } };
track("/api/v1/latest", brokenStub, undefined);
await flush(brokenStub); // hata dışarı sızmamalı
console.log("✓ Yazma hatası yutuldu, çağrı zinciri kırılmadı.\n");

// --- Test 5: Node tarafı sayaç (usageStore) ---
console.log("[Test 5] Node/Express sayacı doğru toplam ve sıralama veriyor mu?");
usageStore.reset();
for (let i = 0; i < 4; i++) usageStore.record("/api/v1/items");
for (let i = 0; i < 7; i++) usageStore.record("/api/v1/latest");
const st = usageStore.stats(30);
assert.equal(st.total, 11);
assert.equal(st.endpoints[0].path, "/api/v1/latest"); // en çok çağrılan başta
assert.equal(st.endpoints[0].count, 7);
assert.equal(st.daily.length, 1);
assert.equal(st.daily[0].count, 11);
assert.ok(st.firstSeen, "firstSeen dolu olmalı");
console.log(`✓ Toplam ${st.total}, en çok çağrılan: ${st.endpoints[0].path} (${st.endpoints[0].count}).\n`);

usageStore.reset();
console.log("🎉 KULLANIM SAYACI TESTLERİ BAŞARIYLA GEÇTİ!");
