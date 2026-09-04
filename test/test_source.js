import assert from "node:assert/strict";
import { assertRecordsAreSane } from "../src/engine/tufeSource.js";

console.log("=== TÜFE VERİ KAYNAĞI TESTLERİ ===\n");

const valid = [];
for (let y = 1977; y <= 2026; y++) {
  for (let m = 1; m <= 12; m++) {
    valid.push({ year: y, month: m, aylikYuzde: 1.5, yilBasindanYuzde: null, yillikYuzde: null });
  }
}
const prevMeta = { recordCount: valid.length, endPeriod: "2026-12" };

// --- Test 1: geçerli veri kabul edilmeli ---
console.log("[Test 1] Geçerli seri kabul ediliyor mu?");
const endPeriod = assertRecordsAreSane(valid, prevMeta);
assert.equal(endPeriod, "2026-12");
console.log(`✓ Kabul edildi, son dönem: ${endPeriod}.\n`);

// --- Test 2: seri kısalamaz ---
console.log("[Test 2] Kayıt sayısı gerilerse reddediliyor mu?");
assert.throws(
  () => assertRecordsAreSane(valid.slice(0, valid.length - 10), prevMeta),
  /Kayıt sayısı geriledi/
);
console.log("✓ Kısalmış seri reddedildi, yerel veri korunur.\n");

// --- Test 3: boş / hatalı yapı ---
console.log("[Test 3] Boş ve bozuk yapılar reddediliyor mu?");
assert.throws(() => assertRecordsAreSane([], prevMeta), /boş veya dizi değil/);
assert.throws(() => assertRecordsAreSane(null, prevMeta), /boş veya dizi değil/);
assert.throws(
  () => assertRecordsAreSane([{ year: "iki bin", month: 13 }], prevMeta),
  /Geçersiz kayıt yapısı/
);
console.log("✓ Boş dizi, null ve bozuk kayıt reddedildi.\n");

// --- Test 4: kaynak yerelden eski olamaz ---
console.log("[Test 4] Kaynak mevcut veriden eskiyse reddediliyor mu?");
const older = valid.filter((r) => !(r.year === 2026 && r.month > 6));
assert.throws(
  () => assertRecordsAreSane(older, { recordCount: older.length, endPeriod: "2026-12" }),
  /Kaynak mevcut veriden eski/
);
console.log("✓ Geriye giden dönem reddedildi.\n");

// --- Test 5: ilk kurulum (önceki meta yok) ---
console.log("[Test 5] İlk kurulumda (meta yok) çalışıyor mu?");
assert.equal(assertRecordsAreSane(valid, null), "2026-12");
console.log("✓ Önceki meta olmadan da doğrulanıyor.\n");

console.log("🎉 VERİ KAYNAĞI TESTLERİ BAŞARIYLA GEÇTİ!");
