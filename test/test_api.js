import assert from "node:assert/strict";
import { dataStore } from "../src/engine/dataStore.js";
import { createApp } from "../src/api/app.js";

async function runApiTests() {
  console.log("=== FAZ 2 API TESTLERİ BAŞLIYOR ===");

  await dataStore.init();
  const app = createApp();

  // Test sunucusunu rastgele serbest bir portta başlat
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test sunucusu geçici portta çalışıyor: ${baseUrl}`);

  try {
    // 1. Health Endpoint
    console.log("\n[Test 1] GET /health");
    const resHealth = await fetch(`${baseUrl}/health`);
    assert.equal(resHealth.status, 200);
    const jsonHealth = await resHealth.json();
    assert.equal(jsonHealth.status, "healthy");
    assert.ok(jsonHealth.dataEngine.recordCount > 500);
    console.log(`✓ /health OK: ${jsonHealth.dataEngine.recordCount} kayıt hazır.`);

    // 2. Meta Endpoint
    console.log("\n[Test 2] GET /api/v1/meta");
    const resMeta = await fetch(`${baseUrl}/api/v1/meta`);
    assert.equal(resMeta.status, 200);
    const jsonMeta = await resMeta.json();
    assert.equal(jsonMeta.success, true);
    assert.ok(jsonMeta.meta.recordCount > 0);
    console.log(`✓ /api/v1/meta OK: Son başlık "${jsonMeta.meta.latestHeadline}"`);

    // 3. Latest Endpoint
    console.log("\n[Test 3] GET /api/v1/latest");
    const resLatest = await fetch(`${baseUrl}/api/v1/latest`);
    assert.equal(resLatest.status, 200);
    const jsonLatest = await resLatest.json();
    assert.equal(jsonLatest.success, true);
    assert.ok(jsonLatest.data.year >= 2026);
    assert.ok(jsonLatest.data.monthName.length > 0);
    console.log(`✓ /api/v1/latest OK: ${jsonLatest.data.year} ${jsonLatest.data.monthName} (Aylık: %${jsonLatest.data.aylikYuzde})`);

    // 4. Time series queries
    console.log("\n[Test 4] GET /api/v1/tufe (Pagination & Filters)");
    const resTufe = await fetch(`${baseUrl}/api/v1/tufe?start_year=2023&end_year=2024&limit=5&sort=desc`);
    assert.equal(resTufe.status, 200);
    const jsonTufe = await resTufe.json();
    assert.equal(jsonTufe.success, true);
    assert.equal(jsonTufe.pagination.limit, 5);
    assert.equal(jsonTufe.data.length, 5);
    assert.equal(jsonTufe.data[0].year, 2024);
    console.log(`✓ /api/v1/tufe filtreleme ve sayfalama başarılı.`);

    // 5. Yearly detail
    console.log("\n[Test 5] GET /api/v1/tufe/2024");
    const resYear = await fetch(`${baseUrl}/api/v1/tufe/2024`);
    assert.equal(resYear.status, 200);
    const jsonYear = await resYear.json();
    assert.equal(jsonYear.year, 2024);
    assert.equal(jsonYear.monthCount, 12);
    assert.ok(jsonYear.statistics.period1.isComplete);
    console.log(`✓ /api/v1/tufe/2024 OK: Ortalama aylık: %${jsonYear.statistics.averageMonthlyInflation}`);

    // 6. Single month detail
    console.log("\n[Test 6] GET /api/v1/tufe/2024/6");
    const resMonth = await fetch(`${baseUrl}/api/v1/tufe/2024/6`);
    assert.equal(resMonth.status, 200);
    const jsonMonth = await resMonth.json();
    assert.equal(jsonMonth.data.month, 6);
    assert.equal(jsonMonth.data.monthName, "Haziran");
    console.log(`✓ /api/v1/tufe/2024/6 OK: ${jsonMonth.data.monthName} %${jsonMonth.data.aylikYuzde}`);

    // 7. Periods Endpoint
    console.log("\n[Test 7] GET /api/v1/periods");
    const resPeriods = await fetch(`${baseUrl}/api/v1/periods?year=2024`);
    assert.equal(resPeriods.status, 200);
    const jsonPeriods = await resPeriods.json();
    assert.equal(jsonPeriods.success, true);
    assert.ok(jsonPeriods.data.period1.cumulativeRate > 0);
    console.log(`✓ /api/v1/periods OK: 1. Dönem: %${jsonPeriods.data.period1.cumulativeRate}, 2. Dönem: %${jsonPeriods.data.period2.cumulativeRate}`);

    // 8. Calculate Endpoint
    console.log("\n[Test 8] GET /api/v1/calculate");
    const resCalc = await fetch(`${baseUrl}/api/v1/calculate?start_year=2023&start_month=1&end_year=2024&end_month=12&amount=10000`);
    assert.equal(resCalc.status, 200);
    const jsonCalc = await resCalc.json();
    assert.equal(jsonCalc.success, true);
    assert.ok(jsonCalc.result.revaluedAmount > 10000);
    console.log(`✓ /api/v1/calculate OK: 10.000 TL -> ${jsonCalc.result.revaluedAmount} TL`);

    // 9. Sync API Auth Protection
    console.log("\n[Test 9] POST /api/v1/sync (Yetkisiz Erişim Kontrolü)");
    const resUnauthorized = await fetch(`${baseUrl}/api/v1/sync`, { method: "POST" });
    assert.equal(resUnauthorized.status, 401);
    console.log(`✓ /api/v1/sync yetkisiz istekleri 401 ile başarıyla engelliyor.`);

    // 10. 404 Route Handling
    console.log("\n[Test 10] 404 Route Test");
    const res404 = await fetch(`${baseUrl}/api/v1/bilinmeyen_rota`);
    assert.equal(res404.status, 404);
    console.log(`✓ Bilinmeyen rotalar standart 404 JSON dönüyor.`);

    // 11. OpenAPI JSON Şeması
    console.log("\n[Test 11] GET /api/openapi.json");
    const resOpenApi = await fetch(`${baseUrl}/api/openapi.json`);
    assert.equal(resOpenApi.status, 200);
    const jsonOpenApi = await resOpenApi.json();
    assert.equal(jsonOpenApi.openapi, "3.0.3");
    assert.ok(jsonOpenApi.paths["/api/v1/latest"]);
    console.log(`✓ /api/openapi.json OK: OpenAPI 3.0.3 şeması doğrulandı.`);

    // 12. Swagger UI /docs
    console.log("\n[Test 12] GET /docs/");
    const resDocs = await fetch(`${baseUrl}/docs/`);
    assert.equal(resDocs.status, 200);
    const textDocs = await resDocs.text();
    assert.ok(textDocs.includes("swagger-ui"));
    console.log(`✓ /docs/ Swagger UI HTML başarıyla servis ediliyor.`);

    // 13. Landing Page GET /
    console.log("\n[Test 13] GET /");
    const resHome = await fetch(`${baseUrl}/`);
    assert.equal(resHome.status, 200);
    const textHome = await resHome.text();
    assert.ok(textHome.includes("KKTC TÜFE RESTful API"));
    console.log(`✓ GET / Açılış ve hızlı başlangıç sayfası başarıyla yüklendi.`);

    console.log("\n🎉 TÜM API VE DOKÜMANTASYON TESTLERİ EKSİKSİZ VE BAŞARIYLA GEÇTİ!");
  } finally {
    server.close();
  }
}

runApiTests().catch((err) => {
  console.error("API Test Hatası:", err);
  process.exit(1);
});
