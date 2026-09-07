import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { dataStore } from "../../engine/dataStore.js";
import { fetchTufeData } from "../../engine/tufeSource.js";
import { config } from "../../config.js";

const router = Router();

/**
 * Sabit zamanlı karşılaştırma: `!==` ilk farklı baytta çıkar ve yanıt
 * süresinden anahtar karakter karakter tahmin edilebilir hale gelir.
 * @param {string} a
 * @param {string} b
 */
function secureCompare(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  // timingSafeEqual eşit uzunluk ister; uzunluk farkı zaten sır değildir
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/v1/sync
 * Kaynaktan manuel senkronizasyon tetikleme (API anahtarı korumalı)
 */
router.post("/sync", async (req, res) => {
  // Anahtar yapılandırılmamışsa uç nokta hiç açılmaz
  if (!config.apiKey) {
    return res.status(503).json({
      success: false,
      error:
        "Senkronizasyon uç noktası devre dışı: sunucuda API_KEY ortam değişkeni tanımlı değil.",
    });
  }

  const provided =
    req.headers["x-api-key"] || req.headers.authorization?.replace("Bearer ", "");

  if (!provided || !secureCompare(provided, config.apiKey)) {
    return res.status(401).json({
      success: false,
      error: "Yetkisiz erişim. Geçerli bir X-API-Key veya Bearer token gereklidir.",
    });
  }

  try {
    console.log("[Sync API] Manuel senkronizasyon tetiklendi...");
    const { records, meta } = await fetchTufeData(dataStore.getMeta());
    const result = await dataStore.save(records, meta);

    return res.json({
      success: true,
      message: "Senkronizasyon başarıyla tamamlandı.",
      changed: result.changed,
      recordCount: result.recordCount,
      latestHeadline: meta.latestHeadline,
      dataSource: meta.dataSource,
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
