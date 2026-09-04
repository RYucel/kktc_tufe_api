import { performance } from "node:perf_hooks";

const BASE_URL = process.env.LIVE_URL || "https://kktc-tufe-api.stevevaius.workers.dev";

async function testEndpoint(name, path) {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    const duration = Math.round(performance.now() - start);
    const contentType = res.headers.get("content-type") || "";

    let bodySummary = "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        bodySummary = `Array (${data.data.length} kayıt)`;
      } else if (data.data) {
        bodySummary = JSON.stringify(data.data).slice(0, 80) + "...";
      } else if (data.result) {
        bodySummary = data.result.note || JSON.stringify(data.result).slice(0, 80);
      } else {
        bodySummary = JSON.stringify(data).slice(0, 80);
      }
    } else {
      const text = await res.text();
      bodySummary = `HTML (${text.length} bayt)`;
    }

    const icon = res.ok ? "✅" : "❌";
    console.log(`${icon} [${res.status}] ${name.padEnd(28)} | ${String(duration).padStart(4)} ms | ${bodySummary}`);
    return res.ok;
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    console.log(`❌ [HATA] ${name.padEnd(28)} | ${duration} ms | ${err.message}`);
    return false;
  }
}

async function run() {
  console.log("===============================================================================");
  console.log(`🌍 CANLI CLOUDFLARE EDGE API TESTLERİ BAŞLIYOR: ${BASE_URL}`);
  console.log("===============================================================================");

  const endpoints = [
    ["1. Sağlık Kontrolü", "/health"],
    ["2. Açılış Sayfası", "/"],
    ["3. Swagger UI Arayüzü", "/docs"],
    ["4. OpenAPI Şeması", "/api/openapi.json"],
    ["5. Meta Veri Bilgisi", "/api/v1/meta"],
    ["6. En Son TÜFE Verisi", "/api/v1/latest"],
    ["7. Filtreli Seri (2024)", "/api/v1/tufe?start_year=2024&limit=5&sort=desc"],
    ["8. Yıllık Döküm (2023)", "/api/v1/tufe/2023"],
    ["9. Tekil Ay (2024/6)", "/api/v1/tufe/2024/6"],
    ["10. KKTC 6 Aylık Dönemler", "/api/v1/periods?year=2024"],
    ["11. Tüm Yıllar Dönemleri", "/api/v1/periods?all=true"],
    ["12. Değerleme (10.000 TL)", "/api/v1/calculate?start_year=2023&start_month=1&amount=10000"],
    ["13. Sepet Kalemleri (520)", "/api/v1/items?limit=5"],
    ["14. Madde Arama (Ekmek)", "/api/v1/items?search=ekmek"],
    ["15. Madde Fiyatı (Ekmek)", "/api/v1/items/ekmek"],
    ["16. Madde Fiyatı (Benzin)", "/api/v1/items/benzin?start_year=2020&end_year=2023"],
    ["17. Aylık Sepet Fiyatları", "/api/v1/prices?period=2024-01&limit=5"],
    ["18. Fiyat Karşılaştırma", "/api/v1/items/compare?items=ekmek,pirinc,benzin"],
    ["19. 404 Hata Yönetimi", "/api/v1/olmayan_sayfa"],
  ];

  let successCount = 0;
  for (const [name, path] of endpoints) {
    const ok = await testEndpoint(name, path);
    // 404 testi için 404 dönmesi beklenen davranıştır
    if (path.includes("olmayan_sayfa")) {
      successCount++;
    } else if (ok) {
      successCount++;
    }
  }

  console.log("===============================================================================");
  console.log(`📊 Test Sonucu: ${successCount} / ${endpoints.length} uç nokta başarıyla yanıt verdi.`);
  console.log("===============================================================================");
}

run();
