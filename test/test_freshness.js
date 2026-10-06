import assert from "node:assert/strict";
import { computeFreshness } from "../src/engine/freshness.js";
import { dataStore } from "../src/engine/dataStore.js";
import { itemsStore } from "../src/engine/itemsStore.js";
import { createApp } from "../src/api/app.js";
import workerApp from "../src/worker.js";

async function runFreshnessTests() {
  console.log("=== VERİ TAZELİĞİ TESTLERİ BAŞLIYOR ===");

  await dataStore.init();
  const app = createApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Bu modülün tüm sebebi Ekim 2026'daki sessiz boşluktu: TÜFE Eylül'e
    // geçmişti, sepet Ağustos'ta kalmıştı ve iki uç da "sağlıklı" diyordu.
    console.log("\n[Test 1] Dört durum doğru sınıflanıyor");
    const durumlar = [
      [{ tufeEnd: "2026-09", itemsEnd: "2026-09" }, "current", 0],
      [{ tufeEnd: "2026-09", itemsEnd: "2026-08" }, "pending", 1],
      [{ tufeEnd: "2026-09", itemsEnd: "2026-07" }, "stale", 2],
      [{ tufeEnd: "2026-09", itemsEnd: "2026-01" }, "stale", 8],
      [{ tufeEnd: "2026-08", itemsEnd: "2026-09" }, "ahead", -1],
    ];
    for (const [girdi, beklenenDurum, beklenenLag] of durumlar) {
      const f = computeFreshness(girdi);
      assert.equal(f.status, beklenenDurum, `${JSON.stringify(girdi)} -> ${f.status}`);
      assert.equal(f.itemsLagMonths, beklenenLag, `${JSON.stringify(girdi)} lag`);
      assert.ok(f.note.length > 0, "not boş olmamalı");
    }
    console.log(`✓ ${durumlar.length} senaryonun tamamı doğru: current / pending / stale / ahead.`);

    // Yıl sınırını geçen fark en sık yapılan hesap hatasıdır.
    console.log("\n[Test 2] Yıl sınırı aşan gecikme doğru sayılıyor");
    assert.equal(computeFreshness({ tufeEnd: "2027-01", itemsEnd: "2026-11" }).itemsLagMonths, 2);
    assert.equal(computeFreshness({ tufeEnd: "2027-02", itemsEnd: "2026-02" }).itemsLagMonths, 12);
    assert.equal(computeFreshness({ tufeEnd: "2027-01", itemsEnd: "2026-12" }).status, "pending");
    console.log("✓ 2026-11 -> 2027-01 = 2 ay, 2026-02 -> 2027-02 = 12 ay.");

    console.log("\n[Test 3] Eksik veya bozuk dönem sessizce yanlış sayı üretmiyor");
    const bozuk = [
      {},
      { tufeEnd: null, itemsEnd: "2026-09" },
      { tufeEnd: "2026-09", itemsEnd: null },
      { tufeEnd: "2026-13", itemsEnd: "2026-09" },
      { tufeEnd: "2026-9", itemsEnd: "2026-09" },
      { tufeEnd: "abc", itemsEnd: "2026-09" },
      { tufeEnd: 202609, itemsEnd: "2026-09" },
    ];
    for (const girdi of bozuk) {
      const f = computeFreshness(girdi);
      assert.equal(f.status, "unknown", `${JSON.stringify(girdi)} -> ${f.status}`);
      assert.equal(f.itemsLagMonths, null);
    }
    console.log(`✓ ${bozuk.length} geçersiz girdinin tamamı 'unknown', lag null.`);

    // Canlı veri: su anda iki seri de ayni ayda olmali.
    console.log("\n[Test 4] Yüklü veride tazelik");
    const itemsMeta = itemsStore.getMeta();
    const latest = dataStore.getLatest();
    const tufeEnd = `${latest.year}-${String(latest.month).padStart(2, "0")}`;
    const f = computeFreshness({ tufeEnd, itemsEnd: itemsMeta.endPeriod });
    console.log(`  TÜFE: ${tufeEnd} | sepet: ${itemsMeta.endPeriod} -> ${f.status} (${f.itemsLagMonths} ay)`);
    assert.ok(["current", "pending", "stale", "ahead"].includes(f.status));
    assert.equal(typeof f.itemsLagMonths, "number");

    console.log("\n[Test 5] /health ve /api/v1/meta alanı yayınlıyor");
    for (const [ad, al] of [
      ["Express", (yol) => fetch(`${baseUrl}${yol}`).then((r) => r.json())],
      ["Worker", (yol) => workerApp.request(yol).then((r) => r.json())],
    ]) {
      const health = await al("/health");
      // Bayat veri servisi cokmus saymaz: iki alan kasten ayri.
      assert.equal(health.status, "healthy", `${ad} servis durumu degismemeli`);
      assert.ok(health.dataFreshness, `${ad} /health dataFreshness eksik`);
      assert.equal(health.dataFreshness.tufeEnd, tufeEnd);
      assert.equal(health.dataFreshness.itemsEnd, itemsMeta.endPeriod);
      assert.equal(health.dataFreshness.itemsLagMonths, f.itemsLagMonths);

      const metaRes = await al("/api/v1/meta");
      assert.ok(metaRes.meta.dataFreshness, `${ad} /api/v1/meta dataFreshness eksik`);
      assert.equal(metaRes.meta.dataFreshness.status, f.status);
    }
    console.log("✓ İki ortamda da /health ve /api/v1/meta alanı taşıyor; servis durumu 'healthy' kaldı.");

    console.log("\n[Test 6] Express ve Worker tazelik bloğu birebir aynı");
    for (const yol of ["/health", "/api/v1/meta"]) {
      const [e, w] = await Promise.all([
        fetch(`${baseUrl}${yol}`).then((r) => r.json()),
        workerApp.request(yol).then((r) => r.json()),
      ]);
      const al = (j) => (yol === "/health" ? j.dataFreshness : j.meta.dataFreshness);
      assert.deepEqual(al(w), al(e), `tazelik paritesi bozuk: ${yol}`);
    }
    console.log("✓ Her iki uçta tazelik blokları özdeş.");

    console.log("\n🎉 TÜM VERİ TAZELİĞİ TESTLERİ BAŞARIYLA GEÇTİ!");
  } finally {
    server.close();
  }
}

runFreshnessTests().catch((err) => {
  console.error("Veri Tazeliği Test Hatası:", err);
  process.exit(1);
});
