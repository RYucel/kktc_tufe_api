import { Router } from "express";
import { dataStore } from "../../engine/dataStore.js";
import { calculateInflationBetween } from "../../engine/calculator.js";

const router = Router();

/**
 * GET /api/v1/calculate
 * İki tarih arasındaki bileşik enflasyonu ve girilen tutarın bugünkü/hedef tarihteki alım gücü karşılığını hesaplar.
 * Query parametreleri:
 *  - start_year (zorunlu)
 *  - start_month (zorunlu, 1-12)
 *  - end_year (opsiyonel, varsayılan: en son kaydın yılı)
 *  - end_month (opsiyonel, varsayılan: en son kaydın ayı)
 *  - amount (opsiyonel, varsayılan: 100)
 */
router.get("/calculate", (req, res) => {
  const { start_year, start_month, end_year, end_month, amount = 100 } = req.query;

  if (!start_year || !start_month) {
    return res.status(400).json({
      success: false,
      error: "start_year ve start_month parametreleri zorunludur.",
      example: "/api/v1/calculate?start_year=2023&start_month=1&end_year=2024&end_month=12&amount=10000",
    });
  }

  const sy = Number(start_year);
  const sm = Number(start_month);
  const amt = Number(amount);

  const latest = dataStore.getLatest();
  const ey = end_year !== undefined ? Number(end_year) : (latest ? latest.year : sy);
  const em = end_month !== undefined ? Number(end_month) : (latest ? latest.month : sm);

  if (Number.isNaN(sy) || Number.isNaN(sm) || Number.isNaN(ey) || Number.isNaN(em) || Number.isNaN(amt)) {
    return res.status(400).json({
      success: false,
      error: "Sayısal değerler geçersiz.",
    });
  }

  if (sm < 1 || sm > 12 || em < 1 || em > 12) {
    return res.status(400).json({
      success: false,
      error: "Aylar 1 ile 12 arasında olmalıdır.",
    });
  }

  try {
    const calculation = calculateInflationBetween(dataStore.records, sy, sm, ey, em, amt);
    return res.json({
      success: true,
      ...calculation,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
