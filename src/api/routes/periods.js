import { Router } from "express";
import { dataStore } from "../../engine/dataStore.js";
import { calculateYearPeriods } from "../../engine/calculator.js";

const router = Router();

/**
 * GET /api/v1/periods
 * KKTC Hayat Pahalılığı ve Maaş Endeksleme Dönemleri (1. Dönem: Ocak-Haziran, 2. Dönem: Temmuz-Aralık)
 * Query parametreleri: year (varsayılan: en son yıl), all (boolean)
 */
router.get("/periods", (req, res) => {
  const { year, all } = req.query;

  if (all === "true") {
    const years = [...dataStore.byYear.keys()].sort((a, b) => b - a);
    const allPeriods = years.map((y) => calculateYearPeriods(dataStore.records, y));
    return res.json({
      success: true,
      description: "KKTC 6 Aylık Hayat Pahalılığı (Maaş ve Ücret Artış) Endeksleme Dönemleri (1977-Günümüz)",
      count: allPeriods.length,
      data: allPeriods,
    });
  }

  const targetYear = year !== undefined ? Number(year) : (dataStore.getLatest()?.year || new Date().getFullYear());
  if (Number.isNaN(targetYear)) {
    return res.status(400).json({
      success: false,
      error: "Geçersiz yıl parametresi girildi.",
    });
  }

  const periodData = calculateYearPeriods(dataStore.records, targetYear);

  return res.json({
    success: true,
    description: "KKTC Kamu Maaşları ve Asgari Ücret Belirlemesinde Kullanılan Resmi 6 Aylık Kümülatif Dönemler",
    data: periodData,
    notes: [
      "1. Dönem (Ocak - Haziran): Haziran ayının resmi 'Yılbaşından Bu Yana' (ytd) değişim oranıdır.",
      "2. Dönem (Temmuz - Aralık): Temmuz'dan Aralık'a kadar olan aylık değişimlerin bileşik çarpımıdır [ ∏ (1 + a_i/100) - 1 ]."
    ],
  });
});

export default router;
