import { Router } from "express";
import { dataStore } from "../../engine/dataStore.js";
import { calculateYearPeriods } from "../../engine/calculator.js";

const router = Router();

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

/**
 * GET /api/v1/latest
 * En son açıklanan ayın enflasyon verisi
 */
router.get("/latest", (req, res) => {
  const latest = dataStore.getLatest();
  if (!latest) {
    return res.status(404).json({
      success: false,
      error: "Henüz yüklü TÜFE verisi bulunamadı.",
    });
  }

  const periods = calculateYearPeriods(dataStore.records, latest.year);

  return res.json({
    success: true,
    data: {
      ...enrichRecord(latest),
      currentYearStatus: {
        period1: periods.period1,
        period2: periods.period2,
      },
    },
    meta: {
      lastChecked: dataStore.getMeta()?.lastChecked,
      lastChanged: dataStore.getMeta()?.lastChanged,
    },
  });
});

/**
 * GET /api/v1/tufe
 * Filtreli TÜFE zaman serisi sorgulama
 * Query parametreleri: year, month, start_year, end_year, sort (asc/desc), limit, offset
 */
router.get("/tufe", (req, res) => {
  const { year, month, start_year, end_year, sort = "asc", limit, offset = 0 } = req.query;

  const result = dataStore.query({
    year: year !== undefined ? Number(year) : undefined,
    month: month !== undefined ? Number(month) : undefined,
    startYear: start_year !== undefined ? Number(start_year) : undefined,
    endYear: end_year !== undefined ? Number(end_year) : undefined,
    sort: sort.toLowerCase() === "desc" ? "desc" : "asc",
    limit: limit !== undefined ? Number(limit) : undefined,
    offset: Number(offset) || 0,
  });

  return res.json({
    success: true,
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      count: result.count,
    },
    data: result.data.map(enrichRecord),
  });
});

/**
 * GET /api/v1/tufe/:year
 * Belirli bir yıla ait tüm aylar ve yıllık özet
 */
router.get("/tufe/:year", (req, res) => {
  const year = Number(req.params.year);
  if (Number.isNaN(year) || year < 1970 || year > 2100) {
    return res.status(400).json({
      success: false,
      error: "Geçersiz yıl parametresi girildi.",
    });
  }

  const yearRecords = dataStore.getByYear(year);
  if (yearRecords.length === 0) {
    return res.status(404).json({
      success: false,
      error: `${year} yılına ait TÜFE verisi bulunamadı.`,
    });
  }

  const periods = calculateYearPeriods(dataStore.records, year);
  const monthlyRates = yearRecords
    .map((r) => r.aylikYuzde)
    .filter((v) => v !== null && v !== undefined);

  const averageMonthly = monthlyRates.length > 0
    ? Math.round((monthlyRates.reduce((a, b) => a + b, 0) / monthlyRates.length) * 10000) / 10000
    : null;

  return res.json({
    success: true,
    year,
    monthCount: yearRecords.length,
    statistics: {
      averageMonthlyInflation: averageMonthly,
      minMonthly: monthlyRates.length > 0 ? Math.min(...monthlyRates) : null,
      maxMonthly: monthlyRates.length > 0 ? Math.max(...monthlyRates) : null,
      period1: periods.period1,
      period2: periods.period2,
      annualTotal: periods.annualTotal,
    },
    months: yearRecords.map(enrichRecord),
  });
});

/**
 * GET /api/v1/tufe/:year/:month
 * Belirli bir yıl ve aya ait detay
 */
router.get("/tufe/:year/:month", (req, res) => {
  const year = Number(req.params.year);
  const month = Number(req.params.month);

  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({
      success: false,
      error: "Geçersiz yıl veya ay parametresi. Ay 1-12 arasında olmalıdır.",
    });
  }

  const record = dataStore.getByYearMonth(year, month);
  if (!record) {
    return res.status(404).json({
      success: false,
      error: `${year}/${month} dönemine ait kayıt bulunamadı.`,
    });
  }

  return res.json({
    success: true,
    data: enrichRecord(record),
  });
});

export default router;
