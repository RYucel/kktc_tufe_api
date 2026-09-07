import assert from "node:assert/strict";
import { assertRecordsAreSane } from "../src/engine/tufeSource.js";
import { assertLocalIsNotAhead } from "../src/engine/syncItemsService.js";

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

// --- Test 6: yerel CSV kaynaktan yeniyse üzerine yazılmamalı ---
// Gerçek vaka (7 Eylül 2026): GRETL_TUFE.csv yanlışlıkla API deposuna
// yüklendi; CI kaynaktaki eski sürümü indirip 22 saniye içinde sessizce
// üzerine yazdı. Kimse fark etmedi.
console.log("[Test 6] Yerel CSV kaynaktan yeniyse durduruluyor mu?");

const aylar = (n, son) => ({
  payload: { periods: Array.from({ length: n }, (_, i) => `p${i}`) },
  meta: { totalMonths: n, endPeriod: son },
});

const yerelAgustos = aylar(140, "2026-08");
const kaynakTemmuz = aylar(139, "2026-07");

let yakalandi = null;
try {
  assertLocalIsNotAhead(kaynakTemmuz.payload, yerelAgustos.meta);
} catch (e) {
  yakalandi = e;
}
assert.ok(yakalandi, "yerel daha yeniyken hata bekleniyordu");
assert.equal(yakalandi.fatal, true, "hata ölümcül işaretlenmeli (CI kırılmalı)");
assert.match(yakalandi.message, /DAHA YENİ/);
assert.match(yakalandi.message, /kktc_tufe/);
console.log("✓ Yanlış depoya yükleme yakalandı ve ölümcül işaretlendi.");


// --- Test 7: normal akış engellenmemeli ---
console.log("[Test 7] Normal güncelleme ve değişiklik yok durumları geçiyor mu?");
assert.doesNotThrow(() => assertLocalIsNotAhead(yerelAgustos.payload, kaynakTemmuz.meta)); // kaynak yeni
assert.doesNotThrow(() => assertLocalIsNotAhead(yerelAgustos.payload, yerelAgustos.meta)); // ayni
assert.doesNotThrow(() => assertLocalIsNotAhead(yerelAgustos.payload, null)); // ilk kurulum
console.log("✓ Kaynak yeni / aynı / ilk kurulum durumları serbest geçiyor.");


console.log("🎉 VERİ KAYNAĞI TESTLERİ BAŞARIYLA GEÇTİ!");
