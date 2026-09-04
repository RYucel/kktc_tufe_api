import { Router } from "express";
import { dataStore } from "../../engine/dataStore.js";
import { scrapeTufeData } from "../../engine/scraper.js";
import { config } from "../../config.js";

const router = Router();

/**
 * POST /api/v1/sync
 * Resmi kaynaktan manuel senkronizasyon tetikleme (API anahtarı korumalı)
 */
router.post("/sync", async (req, res) => {
  const authHeader = req.headers["x-api-key"] || req.headers.authorization?.replace("Bearer ", "");

  if (!authHeader || authHeader !== config.apiKey) {
    return res.status(401).json({
      success: false,
      error: "Yetkisiz erişim. Geçerli bir X-API-Key veya Bearer token gereklidir.",
    });
  }

  try {
    console.log("[Sync API] Manuel senkronizasyon tetiklendi...");
    const { records, meta } = await scrapeTufeData();
    const result = await dataStore.save(records, meta);

    return res.json({
      success: true,
      message: "Senkronizasyon başarıyla tamamlandı.",
      changed: result.changed,
      recordCount: result.recordCount,
      latestHeadline: meta.latestHeadline,
      latestAvailablePeriod: `${records[records.length - 1].year}-${records[records.length - 1].month}`,
    });
  } catch (err) {
    console.error("[Sync API] Hata:", err);
    return res.status(500).json({
      success: false,
      error: `Senkronizasyon başarısız oldu: ${err.message}`,
    });
  }
});

export default router;
