import { Router } from "express";
import { dataStore } from "../../engine/dataStore.js";
import { itemsStore } from "../../engine/itemsStore.js";
import { usageStore } from "../../engine/usageStore.js";
import { config } from "../../config.js";
import {
  API_VERSION,
  OFFICIAL_SOURCE,
  UPDATE_SCHEDULE_TEXT,
  LICENSE,
} from "../../constants.js";

const router = Router();

/**
 * GET /health
 * Sistem sağlık kontrolü
 *
 * Yanıt şeması Cloudflare Worker sürümüyle aynıdır; yalnızca "platform" ve
 * Node'a özgü "uptimeSeconds" alanı farklılık gösterir.
 */
router.get("/health", (req, res) => {
  const latest = dataStore.getLatest();
  const itemsMeta = itemsStore.getMeta() || {};

  res.json({
    status: "healthy",
    platform: "Node.js (Express)",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    dataEngine: {
      initialized: dataStore.isInitialized,
      recordCount: dataStore.records.length,
      latestDataPeriod: latest ? `${latest.year}-${String(latest.month).padStart(2, "0")}` : null,
    },
    itemsEngine: {
      initialized: itemsStore.isInitialized,
      totalItems: itemsMeta.totalItems ?? null,
      totalMonths: itemsMeta.totalMonths ?? null,
      periodRange:
        itemsMeta.startPeriod && itemsMeta.endPeriod
          ? `${itemsMeta.startPeriod} - ${itemsMeta.endPeriod}`
          : null,
    },
    version: API_VERSION,
  });
});

/**
 * GET /api/v1/meta
 * Veri seti ve kaynak meta bilgileri
 */
router.get("/api/v1/meta", (req, res) => {
  const meta = dataStore.getMeta();
  const latest = dataStore.getLatest();

  res.json({
    success: true,
    meta: {
      ...meta,
      latestAvailablePeriod: latest ? `${latest.year}-${String(latest.month).padStart(2, "0")}` : null,
      officialSource: OFFICIAL_SOURCE,
      tufeSourceUrl: config.sources.githubTufeJsonUrl,
      itemsCsvSourceUrl: config.sources.githubItemsCsvUrl,
      fallbackRssUrl: config.sources.rssUrl,
      updateSchedule: UPDATE_SCHEDULE_TEXT,
      deployedOn: "Node.js (Express)",
      license: LICENSE,
      itemPrices: itemsStore.getMeta(),
    },
  });
});

/**
 * GET /api/v1/stats
 * Kullanım istatistikleri (herkese açık)
 *
 * Edge sürümünde Durable Object'ten, burada süreç belleğinden okunur;
 * yanıt şeması iki tarafta aynıdır.
 */
router.get("/api/v1/stats", (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
  const stats = usageStore.stats(days);

  res.json({
    success: true,
    description:
      "KKTC TÜFE API toplam çağrı sayısı ve uç nokta bazında kullanım dağılımı",
    data: {
      totalRequests: stats.total,
      countingSince: stats.firstSeen,
      endpoints: stats.endpoints,
      dailyRequests: stats.daily,
    },
  });
});

export default router;
