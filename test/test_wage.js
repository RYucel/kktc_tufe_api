import assert from "node:assert/strict";
import { dataStore } from "../src/engine/dataStore.js";
import { WageStore, wageStore } from "../src/engine/wageStore.js";
import { createApp } from "../src/api/app.js";
import workerApp from "../src/worker.js";

const MIN_WAGE_DOC = {
  currency: { redenominationFrom: "2005-01", factor: 1000000 },
  source: "test",
  changes: [
    { effectiveFrom: "2024-01", amount: 100 },
    { effectiveFrom: "2024-07", amount: 150 },
  ],
};

function withChanges(changes) {
  return { ...MIN_WAGE_DOC, changes };
}

async function runWageTests() {
  console.log("=== ASGARİ ÜCRET TESTLERİ BAŞLIYOR ===");

  await dataStore.init();
  const app = createApp(); // wageStore.init() burada çalışır
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // ---------------------------------------------------------------- motor
    console.log("\n[Test 1] Kaynak dosya doğrulaması");
    const meta = wageStore.getMeta();
    assert.ok(meta.changeCount > 70, "ücret kararı sayısı beklenenden az");
    assert.equal(meta.startPeriod, "1977-05");
    assert.ok(meta.currentAmount > 0);
    console.log(`✓ ${meta.changeCount} ücret kararı, ${meta.startPeriod} - ${meta.currentSince}.`);

    console.log("\n[Test 2] Bozuk wage.json açılışta reddediliyor");
    const bozukVeriler = [
      [[{ effectiveFrom: "2024-07", amount: 1 }, { effectiveFrom: "2024-01", amount: 2 }], /kronolojik/],
      [[{ effectiveFrom: "2024-01", amount: 1 }, { effectiveFrom: "2024-01", amount: 2 }], /kronolojik/],
      [[{ effectiveFrom: "2024-13", amount: 1 }], /effectiveFrom/],
      [[{ effectiveFrom: "2024-1", amount: 1 }], /effectiveFrom/],
      [[{ effectiveFrom: "2024-01", amount: 0 }], /amount/],
      [[{ effectiveFrom: "2024-01", amount: "100" }], /amount/],
      [[], /boş olamaz/],
    ];
    for (const [changes, pattern] of bozukVeriler) {
      assert.throws(
        () => new WageStore().init(dataStore.records, withChanges(changes)),
        pattern,
        `reddedilmeliydi: ${JSON.stringify(changes)}`
      );
    }
    console.log(`✓ ${bozukVeriler.length} bozuk girdi biçiminin tamamı açılışta hata veriyor.`);

    // Reel ücret yalnızca iki dönemin endeks ORANINA bağlıdır; taban seçimi
    // serinin şeklini değiştirmemelidir. Taban birimi farklıysa yalnızca
    // ölçek değişir, oranlar sabit kalır.
    console.log("\n[Test 3] Reel seri taban seçiminden bağımsız");
    const a = wageStore.getReal({ base: "2020-01" }).rows;
    const b = wageStore.getReal({ base: "2026-08" }).rows;
    assert.equal(a.length, b.length);
    // realAmount iki ondalığa yuvarlandığı için tolerans sıfır olamaz;
    // 1e-5 yuvarlama gürültüsünün çok üstünde, gerçek bir kaymanın çok altında.
    const scale = b[0].realAmount / a[0].realAmount;
    for (let i = 0; i < a.length; i += 37) {
      const oran = b[i].realAmount / a[i].realAmount;
      assert.ok(Math.abs(oran / scale - 1) < 1e-5, `${a[i].period} tabana göre kaymış`);
    }
    console.log(`✓ İki farklı taban arasında sabit ölçek (${scale.toFixed(6)}), şekil korunuyor.`);

    // 2005 YTL geçişi doğru ele alınmazsa seri burada 1.000.000 kat sıçrar.
    console.log("\n[Test 4] 2005 YTL geçişinde seri sürekli");
    const gecis = wageStore.getReal({ from: "2004-01", to: "2006-12" }).rows;
    for (let i = 1; i < gecis.length; i++) {
      const oran = gecis[i].realAmount / gecis[i - 1].realAmount;
      assert.ok(oran > 0.5 && oran < 2, `${gecis[i].period} aylık reel sıçrama makul değil: ${oran}`);
    }
    const eski = gecis.find((r) => r.period === "2004-07");
    const yeni = gecis.find((r) => r.period === "2005-06");
    assert.equal(eski.nominalCurrency, "TRL");
    assert.equal(yeni.nominalCurrency, "TRY");
    assert.ok(eski.realAmount > 0 && yeni.realAmount / eski.realAmount < 2);
    console.log(`✓ 2004-07 (${eski.nominalAmount} TRL) ve 2005-06 (${yeni.nominalAmount} TRY) aynı ölçekte.`);

    // Aylık seri, ücret kararlarının ileri doldurulmuş hâlidir.
    console.log("\n[Test 5] Aylık seri ücret kararlarıyla tutarlı");
    const aylik = wageStore.getMonthly();
    const kararlar = wageStore.getChanges();
    assert.equal(aylik[0].period, kararlar[0].effectiveFrom);
    assert.equal(aylik[aylik.length - 1].period, meta.seriesEnd);
    for (const k of kararlar) {
      const ay = aylik.find((r) => r.period === k.effectiveFrom);
      assert.equal(ay.amount, k.amount, `${k.effectiveFrom} ileri doldurma hatalı`);
    }
    const benzersiz = new Set(aylik.map((r) => r.amount)).size;
    assert.equal(benzersiz, kararlar.length);
    console.log(`✓ ${aylik.length} ay, ${kararlar.length} karara ileri doldurma ile eşleniyor.`);

    // ------------------------------------------------------------------ HTTP
    console.log("\n[Test 6] GET /api/v1/wage/latest");
    const resLatest = await fetch(`${baseUrl}/api/v1/wage/latest`);
    assert.equal(resLatest.status, 200);
    const jsonLatest = await resLatest.json();
    assert.equal(jsonLatest.success, true);
    assert.equal(jsonLatest.data.effectiveFrom, meta.currentSince);
    assert.ok(typeof jsonLatest.data.previous.nominalIncreasePercent === "number");
    assert.ok(typeof jsonLatest.data.previous.realIncreasePercent === "number");
    console.log(
      `✓ ${jsonLatest.data.effectiveFrom}: ${jsonLatest.data.amount} ${jsonLatest.data.currency} ` +
        `(nominal %${jsonLatest.data.previous.nominalIncreasePercent}, reel %${jsonLatest.data.previous.realIncreasePercent})`
    );

    console.log("\n[Test 7] GET /api/v1/wage (kararlar + aylık + sayfalama)");
    const resChanges = await fetch(`${baseUrl}/api/v1/wage`);
    const jsonChanges = await resChanges.json();
    assert.equal(jsonChanges.granularity, "changes");
    assert.equal(jsonChanges.data.length, meta.changeCount);
    assert.equal(jsonChanges.data[0].nominalIncreasePercent, null, "ilk kaydın artışı olamaz");

    const resMonthly = await fetch(`${baseUrl}/api/v1/wage?granularity=monthly&start_period=2024-01&end_period=2024-12`);
    const jsonMonthly = await resMonthly.json();
    assert.equal(jsonMonthly.data.length, 12);
    assert.equal(jsonMonthly.data[0].period, "2024-01");

    const resPage = await fetch(`${baseUrl}/api/v1/wage?limit=5&offset=2&sort=desc`);
    const jsonPage = await resPage.json();
    assert.equal(jsonPage.data.length, 5);
    assert.equal(jsonPage.pagination.total, meta.changeCount);
    assert.ok(jsonPage.data[0].effectiveFrom > jsonPage.data[1].effectiveFrom, "desc sıralama uygulanmadı");
    console.log(`✓ ${jsonChanges.data.length} karar, 2024 için 12 ay, sayfalama ve sıralama çalışıyor.`);

    console.log("\n[Test 8] GET /api/v1/wage/real");
    const resReal = await fetch(`${baseUrl}/api/v1/wage/real?base=2026-08&start_period=1977-05&end_period=1977-05`);
    const jsonReal = await resReal.json();
    assert.equal(jsonReal.base, "2026-08");
    assert.equal(jsonReal.baseCurrency, "TRY");
    assert.equal(jsonReal.data[0].period, "1977-05");
    assert.ok(jsonReal.data[0].realAmount > jsonReal.data[0].nominalAmount);
    console.log(
      `✓ 1977-05 asgari ücreti (${jsonReal.data[0].nominalAmount} TRL) ` +
        `bugünün parasıyla ${jsonReal.data[0].realAmount} TRY.`
    );

    console.log("\n[Test 9] Geçersiz parametreler 400 dönüyor");
    const hataliIstekler = [
      "/api/v1/wage/real?base=2026-13",
      "/api/v1/wage/real?base=abc",
      "/api/v1/wage/real?base=1800-01",
      "/api/v1/wage?granularity=hepsi",
      "/api/v1/wage?start_period=2024",
      "/api/v1/wage?sort=yukari",
      "/api/v1/wage?limit=0",
      "/api/v1/wage?limit=99999",
      "/api/v1/wage?offset=-1",
    ];
    for (const yol of hataliIstekler) {
      const res = await fetch(`${baseUrl}${yol}`);
      assert.equal(res.status, 400, `${yol} 400 dönmeliydi (${res.status} döndü)`);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.error.length > 0);
    }
    console.log(`✓ ${hataliIstekler.length} geçersiz isteğin tamamı 400 ve açıklayıcı hata dönüyor.`);

    // --------------------------------------------------------------- parite
    // İki çalışma ortamı aynı ortak modülü kullanır; çıktı birebir aynı olmalı.
    console.log("\n[Test 10] Express ve Worker çıktıları birebir aynı");
    const paritYollari = [
      "/api/v1/wage/latest",
      "/api/v1/wage",
      "/api/v1/wage?granularity=monthly&start_period=2020-01&end_period=2020-12",
      "/api/v1/wage/real?base=2010-06&start_period=2010-01&end_period=2010-12",
      "/api/v1/wage/real?sort=desc&limit=3",
    ];
    for (const yol of paritYollari) {
      const [expressBody, workerBody] = await Promise.all([
        fetch(`${baseUrl}${yol}`).then((r) => r.json()),
        workerApp.request(yol).then((r) => r.json()),
      ]);
      assert.deepEqual(workerBody, expressBody, `parite bozuk: ${yol}`);
    }
    console.log(`✓ ${paritYollari.length} uçta Express ve Worker gövdeleri özdeş.`);

    console.log("\n[Test 11] /health ve /api/v1/meta iki ortamda da ücret bilgisini içeriyor");
    for (const [ad, al] of [
      ["Express", (yol) => fetch(`${baseUrl}${yol}`).then((r) => r.json())],
      ["Worker", (yol) => workerApp.request(yol).then((r) => r.json())],
    ]) {
      const health = await al("/health");
      assert.equal(health.wageEngine.initialized, true, `${ad} /health wageEngine eksik`);
      assert.equal(health.wageEngine.changeCount, meta.changeCount);
      const metaRes = await al("/api/v1/meta");
      assert.equal(metaRes.meta.minimumWage.currentSince, meta.currentSince, `${ad} /api/v1/meta eksik`);
    }
    console.log(`✓ İki ortamda da wageEngine ve meta.minimumWage yayınlanıyor.`);

    console.log("\n🎉 TÜM ASGARİ ÜCRET TESTLERİ BAŞARIYLA GEÇTİ!");
  } finally {
    server.close();
  }
}

runWageTests().catch((err) => {
  console.error("Asgari Ücret Test Hatası:", err);
  process.exit(1);
});
