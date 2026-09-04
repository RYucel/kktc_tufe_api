import { Router } from "express";
import { dataStore } from "../../engine/dataStore.js";
import { config } from "../../config.js";

const router = Router();

/**
 * GET /health
 * Sistem sağlık kontrolü
 */
router.get("/health", (req, res) => {
  const latest = dataStore.getLatest();
  res.json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    dataEngine: {
      initialized: dataStore.isInitialized,
      recordCount: dataStore.records.length,
      latestDataPeriod: latest ? `${latest.year}-${String(latest.month).padStart(2, "0")}` : null,
    },
    version: "1.0.0",
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
      officialSource: "KKTC Başbakanlık İstatistik Kurumu",
      sourceRssUrl: config.sources.rssUrl,
      updateSchedule: "Ayın ilk 10 günü her gün otomatik kontrol edilir.",
      license: "MIT - Açık Kaynak",
    },
  });
});

export default router;
