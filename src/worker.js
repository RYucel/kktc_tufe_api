import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import tufeData from "../data/tufe.json" with { type: "json" };
import metaData from "../data/meta.json" with { type: "json" };
import itemsData from "../data/items_data.json" with { type: "json" };
import itemsMeta from "../data/items_meta.json" with { type: "json" };
import { calculateYearPeriods, calculateInflationBetween } from "./engine/calculator.js";
import { itemsStore } from "./engine/itemsStore.js";
import { wageStore } from "./engine/wageStore.js";
import { latestPayload, seriesPayload, realPayload } from "./engine/wagePayload.js";
import { swaggerSpec } from "./api/docs/swaggerSpec.js";
import { renderGuideHtml } from "./views/guide.js";
import { buildGuideStats } from "./views/guideStats.js";
import { track, flush } from "./engine/usageBuffer.js";
import {
  API_VERSION,
  OFFICIAL_SOURCE,
  SOURCE_RSS_URL,
  ITEMS_CSV_SOURCE_URL,
  TUFE_JSON_SOURCE_URL,
  UPDATE_SCHEDULE_TEXT,
  LICENSE,
} from "./constants.js";

// Edge ortamı için sepet motorunu başlat
itemsStore.init(itemsData, itemsMeta);
// Asgari ücret motoru reel değerleri paketlenmiş TÜFE serisinden türetir.
wageStore.init(tufeData);

const app = new Hono();

// Güvenlik Başlıkları & CORS
app.use("*", cors());
app.use("*", secureHeaders());

/** Tek global sayaç örneğine erişim; binding yoksa undefined döner. */
function counterStub(env) {
  const ns = env?.USAGE_COUNTER;
  if (!ns) return undefined;
  return ns.get(ns.idFromName("global"));
}

// Kullanım sayacı: yanıt üretildikten sonra, engellemeden kaydeder.
// Binding yoksa (yerel test, eski deploy) sessizce devre dışı kalır.
/**
 * Sayaç anahtarını yalnızca SUNUCU tarafından tanımlı bir değere indirger.
 *
 * Ham istek yolu kullanılamaz: eşleşmeyen her istek kalıcı bir satır
 * yaratacağı için saldırgan sınırsız anahtar üretip Durable Object'in
 * günlük yazma kotasını ve depolamasını tüketebilir. Eşleşmeyen tüm
 * istekler tek bir kovada toplanır.
 */
function counterKey(c) {
  const routePath = c.req.routePath;
  if (!routePath || routePath === "/*") return "__unmatched__";
  // Kalıp sunucu tarafından tanımlıdır; uzunluk siniri savunma amaçlıdır.
  return routePath.length > 120 ? "__unmatched__" : routePath;
}

app.use("*", async (c, next) => {
  await next();
  try {
    track(counterKey(c), counterStub(c.env), c.executionCtx);
  } catch {
    // sayaç hatası asla isteği etkilemez
  }
});

const MONTH_NAMES = [
  "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

function enrichRecord(rec) {
  if (!rec) return null;
  return {
    ...rec,
    monthName: MONTH_NAMES[rec.month] || "",
    period: `${rec.year}-${String(rec.month).padStart(2, "0")}`,
  };
}

// 1. Health
app.get("/health", (c) => {
  const latest = tufeData[tufeData.length - 1];
  return c.json({
    status: "healthy",
    platform: "Cloudflare Workers (Edge)",
    timestamp: new Date().toISOString(),
    dataEngine: {
      initialized: true,
      recordCount: tufeData.length,
      latestDataPeriod: latest ? `${latest.year}-${String(latest.month).padStart(2, "0")}` : null,
    },
    itemsEngine: {
      initialized: true,
      totalItems: itemsMeta.totalItems,
      totalMonths: itemsMeta.totalMonths,
      periodRange: `${itemsMeta.startPeriod} - ${itemsMeta.endPeriod}`,
    },
    wageEngine: {
      initialized: wageStore.isInitialized,
      changeCount: wageStore.getMeta().changeCount,
      currentSince: wageStore.getMeta().currentSince,
      currentAmount: wageStore.getMeta().currentAmount,
    },
    version: API_VERSION,
  });
});

// 2. Meta
app.get("/api/v1/meta", (c) => {
  const latest = tufeData[tufeData.length - 1];
  return c.json({
    success: true,
    meta: {
      ...metaData,
      latestAvailablePeriod: latest ? `${latest.year}-${String(latest.month).padStart(2, "0")}` : null,
      officialSource: OFFICIAL_SOURCE,
      tufeSourceUrl: TUFE_JSON_SOURCE_URL,
      itemsCsvSourceUrl: ITEMS_CSV_SOURCE_URL,
      fallbackRssUrl: SOURCE_RSS_URL,
      updateSchedule: UPDATE_SCHEDULE_TEXT,
      deployedOn: "Cloudflare Edge Network",
      license: LICENSE,
      itemPrices: itemsMeta,
      minimumWage: wageStore.getMeta(),
    },
  });
});

// 3. Latest
app.get("/api/v1/latest", (c) => {
  const latest = tufeData[tufeData.length - 1];
  if (!latest) {
    return c.json({ success: false, error: "TÜFE verisi bulunamadı." }, 404);
  }
  const periods = calculateYearPeriods(tufeData, latest.year);
  return c.json({
    success: true,
    data: {
      ...enrichRecord(latest),
      currentYearStatus: {
        period1: periods.period1,
        period2: periods.period2,
      },
    },
    meta: {
      lastChecked: metaData.lastChecked,
      lastChanged: metaData.lastChanged,
    },
  });
});

// 4. Tufe queries (Filters, sort, pagination)
app.get("/api/v1/tufe", (c) => {
  const query = c.req.query();
  const year = query.year ? Number(query.year) : undefined;
  const month = query.month ? Number(query.month) : undefined;
  const startYear = query.start_year ? Number(query.start_year) : undefined;
  const endYear = query.end_year ? Number(query.end_year) : undefined;
  const sort = (query.sort || "asc").toLowerCase();
  const limit = query.limit ? Number(query.limit) : undefined;
  const offset = query.offset ? Number(query.offset) : 0;

  let result = [...tufeData];
  if (year !== undefined) result = result.filter((r) => r.year === year);
  if (month !== undefined) result = result.filter((r) => r.month === month);
  if (startYear !== undefined) result = result.filter((r) => r.year >= startYear);
  if (endYear !== undefined) result = result.filter((r) => r.year <= endYear);

  if (sort === "desc") result.reverse();

  const total = result.length;
  const lim = limit !== undefined ? Math.max(1, limit) : total;
  const data = result.slice(offset, offset + lim);

  return c.json({
    success: true,
    pagination: {
      total,
      limit: lim,
      offset,
      count: data.length,
    },
    data: data.map(enrichRecord),
  });
});

// 5. Tufe by year
app.get("/api/v1/tufe/:year", (c) => {
  const year = Number(c.req.param("year"));
  const yearRecords = tufeData.filter((r) => r.year === year);
  if (yearRecords.length === 0) {
    return c.json({ success: false, error: `${year} yılına ait veri bulunamadı.` }, 404);
  }

  const periods = calculateYearPeriods(tufeData, year);
  const monthlyRates = yearRecords.map((r) => r.aylikYuzde).filter((v) => v !== null);
  const avg = monthlyRates.length > 0
    ? Math.round((monthlyRates.reduce((a, b) => a + b, 0) / monthlyRates.length) * 10000) / 10000
    : null;

  return c.json({
    success: true,
    year,
    monthCount: yearRecords.length,
    statistics: {
      averageMonthlyInflation: avg,
      minMonthly: monthlyRates.length > 0 ? Math.min(...monthlyRates) : null,
      maxMonthly: monthlyRates.length > 0 ? Math.max(...monthlyRates) : null,
      period1: periods.period1,
      period2: periods.period2,
      annualTotal: periods.annualTotal,
    },
    months: yearRecords.map(enrichRecord),
  });
});

// 6. Tufe by year and month
app.get("/api/v1/tufe/:year/:month", (c) => {
  const year = Number(c.req.param("year"));
  const month = Number(c.req.param("month"));

  const record = tufeData.find((r) => r.year === year && r.month === month);
  if (!record) {
    return c.json({ success: false, error: `${year}/${month} dönemine ait kayıt bulunamadı.` }, 404);
  }

  return c.json({ success: true, data: enrichRecord(record) });
});

// 7. Periods
app.get("/api/v1/periods", (c) => {
  const query = c.req.query();
  const latest = tufeData[tufeData.length - 1];
  const targetYear = query.year ? Number(query.year) : (latest ? latest.year : 2026);

  if (query.all === "true") {
    const years = [...new Set(tufeData.map((r) => r.year))].sort((a, b) => b - a);
    const allPeriods = years.map((y) => calculateYearPeriods(tufeData, y));
    return c.json({
      success: true,
      description: "KKTC 6 Aylık Hayat Pahalılığı Dönemleri (1977-Günümüz)",
      count: allPeriods.length,
      data: allPeriods,
    });
  }

  const periodData = calculateYearPeriods(tufeData, targetYear);
  return c.json({
    success: true,
    description: "KKTC Kamu Maaşları ve Asgari Ücret Belirlemesinde Kullanılan Resmi 6 Aylık Kümülatif Dönemler",
    data: periodData,
  });
});

// 8. Calculate
app.get("/api/v1/calculate", (c) => {
  const query = c.req.query();
  const sy = Number(query.start_year);
  const sm = Number(query.start_month);
  const amt = query.amount ? Number(query.amount) : 100;

  if (!sy || !sm) {
    return c.json({
      success: false,
      error: "start_year ve start_month parametreleri zorunludur.",
    }, 400);
  }

  const latest = tufeData[tufeData.length - 1];
  const ey = query.end_year ? Number(query.end_year) : (latest ? latest.year : sy);
  const em = query.end_month ? Number(query.end_month) : (latest ? latest.month : sm);

  try {
    const calculation = calculateInflationBetween(tufeData, sy, sm, ey, em, amt);
    return c.json({ success: true, ...calculation });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// 9. Items List (Sepet Kalemleri Listesi)
app.get("/api/v1/items", (c) => {
  const query = c.req.query();
  const search = query.search || "";
  const limit = query.limit !== undefined ? Number(query.limit) : 50;
  const offset = query.offset !== undefined ? Number(query.offset) : 0;

  const result = itemsStore.getItems({ search, limit, offset });
  return c.json({
    success: true,
    meta: itemsStore.getMeta(),
    ...result,
  });
});

// 10. Items Compare (Kalem Fiyat Karşılaştırması)
app.get("/api/v1/items/compare", (c) => {
  const query = c.req.query();
  const items = query.items;

  if (!items) {
    return c.json({
      success: false,
      error: "Karşılaştırmak istediğiniz ürünleri virgülle ayırarak belirtin. Örnek: ?items=ekmek,pirinc,benzin",
    }, 400);
  }

  const itemIdentifiers = String(items)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (itemIdentifiers.length === 0) {
    return c.json({
      success: false,
      error: "En az bir ürün belirtilmelidir.",
    }, 400);
  }

  const comparison = itemsStore.compareItems(itemIdentifiers, {
    startPeriod: query.start_period,
    endPeriod: query.end_period,
  });

  return c.json({
    success: true,
    itemCount: comparison.length,
    data: comparison,
  });
});

// 11. Item History (Tekil Kalem Fiyat Geçmişi)
app.get("/api/v1/items/:item", (c) => {
  const item = c.req.param("item");
  const query = c.req.query();

  const startPeriod = query.start_period || (query.start_year ? `${query.start_year}-01` : undefined);
  const endPeriod = query.end_period || (query.end_year ? `${query.end_year}-12` : undefined);
  const sort = (query.sort || "asc").toLowerCase();

  const history = itemsStore.getItemHistory(item, {
    startPeriod,
    endPeriod,
    sort,
  });

  if (!history) {
    return c.json({
      success: false,
      error: `'${item}' isimli sepet kalemi bulunamadı. /api/v1/items adresinden mevcut 520 kalemi inceleyebilirsiniz.`,
    }, 404);
  }

  return c.json({
    success: true,
    data: history,
  });
});

// 12. Prices by Period (Aylık Sepet Fiyat Dökümü)
app.get("/api/v1/prices", (c) => {
  const query = c.req.query();
  let targetPeriod = query.period;
  if (!targetPeriod && query.year && query.month) {
    targetPeriod = `${query.year}-${String(query.month).padStart(2, "0")}`;
  }

  if (!targetPeriod) {
    const meta = itemsStore.getMeta();
    targetPeriod = meta ? meta.endPeriod : "2024-01";
  }

  const limit = query.limit !== undefined ? Number(query.limit) : 50;
  const offset = query.offset !== undefined ? Number(query.offset) : 0;
  const search = query.search || "";

  const result = itemsStore.getPricesByPeriod(targetPeriod, { search, limit, offset });
  if (!result) {
    return c.json({
      success: false,
      error: `'${targetPeriod}' dönemine ait sepet fiyat verisi bulunamadı. Veri aralığı: 2015-01 ile 2026-07 arasıdır.`,
    }, 404);
  }

  return c.json({
    success: true,
    ...result,
  });
});

// 13. Kullanım İstatistikleri (herkese açık)
app.get("/api/v1/stats", async (c) => {
  const stub = counterStub(c.env);
  if (!stub) {
    return c.json({
      success: false,
      error: "Kullanım sayacı bu ortamda etkin değil.",
    }, 503);
  }

  const days = Math.min(Math.max(Number(c.req.query("days")) || 30, 1), 365);

  try {
    // Bekleyen sayıları önce yaz ki rakamlar taze olsun
    await flush(stub);
    const stats = await stub.stats(days);
    return c.json({
      success: true,
      description: "KKTC TÜFE API toplam çağrı sayısı ve uç nokta bazında kullanım dağılımı",
      data: {
        totalRequests: stats.total,
        countingSince: stats.firstSeen,
        // Liste en çok çağrılan ilk 100 ile sınırlıdır; kaç farklı uç nokta
        // kaydedildiği ayrıca verilir.
        distinctEndpoints: stats.distinctPaths,
        endpoints: stats.endpoints,
        dailyRequests: stats.daily,
      },
    });
  } catch (err) {
    return c.json({ success: false, error: `İstatistikler okunamadı: ${err.message}` }, 500);
  }
});

// 14. OpenAPI JSON
app.get("/api/openapi.json", (c) => {
  return c.json(swaggerSpec);
});

// 10. Swagger UI via CDN (Temiz, Yüksek Okunabilirlikli Görünüm)
app.get("/docs", (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KKTC TÜFE API - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .top-nav {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .top-nav a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.9rem;
    }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 25px 0 15px; }
    .swagger-ui .info .title { color: #0f172a; font-weight: 800; font-size: 28px; }
    .swagger-ui .info p, .swagger-ui .info li { color: #334155; font-size: 15px; line-height: 1.6; }
    .swagger-ui .info .description { color: #334155; }
    .swagger-ui .scheme-container {
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      border-radius: 8px;
      margin: 15px 0;
      padding: 15px;
      border: 1px solid #e2e8f0;
    }
    .swagger-ui .opblock {
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
    }
    .swagger-ui .opblock .opblock-summary { padding: 10px 15px; }
    .swagger-ui .opblock .opblock-summary-path { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0f172a; }
    .swagger-ui .opblock-description-wrapper p { color: #334155; font-size: 14px; }
    .swagger-ui table.parameters { font-size: 14px; }
    .swagger-ui .btn.authorize { color: #059669; border-color: #059669; }
    .swagger-ui .btn.authorize svg { fill: #059669; }
  </style>
</head>
<body>
  <div class="top-nav">
    <a href="/">← Kullanım Kılavuzuna ve Portala Dön</a>
    <span style="font-size: 0.85rem; color: #64748b; font-weight: 600;">KKTC TÜFE API • Swagger UI</span>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
      ],
      layout: "BaseLayout"
    });
  </script>
</body>
</html>
  `);
});

// 10b. Asgari Ücret
// Gövdeler Express ile ortak modülden üretilir; iki çalışma ortamı tanım
// gereği aynı çıktıyı verir.
function wageRoute(c, build) {
  try {
    return c.json(build());
  } catch (err) {
    return c.json({ success: false, error: err.message }, err.status || 500);
  }
}

app.get("/api/v1/wage/latest", (c) => wageRoute(c, () => latestPayload(wageStore)));
app.get("/api/v1/wage/real", (c) => wageRoute(c, () => realPayload(wageStore, c.req.query())));
app.get("/api/v1/wage", (c) => wageRoute(c, () => seriesPayload(wageStore, c.req.query())));

// 11. Kullanım Kılavuzu & Geliştirici Portalı
// Kapsam rakamları paketlenmiş veriden okunur; her deploy'da kendiliğinden tazelenir.
function guideStats() {
  return buildGuideStats({
    tufeRecords: tufeData,
    itemsMeta,
    wageMeta: wageStore.getMeta(),
  });
}

const sendGuide = (c) => c.html(renderGuideHtml({ stats: guideStats() }));

app.get("/", sendGuide);
app.get("/guide", sendGuide);
app.get("/kilavuz", sendGuide);

export default app;

