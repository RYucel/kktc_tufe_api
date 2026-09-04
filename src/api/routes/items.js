import { Router } from "express";
import { itemsStore } from "../../engine/itemsStore.js";

const router = Router();

/**
 * @route GET /api/v1/items
 * @desc KKTC TÜFE Tüketim Sepetindeki 520 Mal ve Hizmet Kalemini Listeler
 */
router.get("/items", (req, res) => {
  const { search, limit, offset } = req.query;

  const result = itemsStore.getItems({
    search: search || "",
    limit: limit !== undefined ? Number(limit) : 50,
    offset: offset !== undefined ? Number(offset) : 0,
  });

  return res.json({
    success: true,
    meta: itemsStore.getMeta(),
    ...result,
  });
});

/**
 * @route GET /api/v1/items/compare
 * @desc Birden fazla mal/hizmetin fiyat gelişimini karşılaştırır
 */
router.get("/items/compare", (req, res) => {
  const { items, start_period, end_period } = req.query;

  if (!items) {
    return res.status(400).json({
      success: false,
      error: "Karşılaştırmak istediğiniz ürünleri virgülle ayırarak belirtin. Örnek: ?items=ekmek,pirinc,benzin",
    });
  }

  const itemIdentifiers = String(items)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (itemIdentifiers.length === 0) {
    return res.status(400).json({
      success: false,
      error: "En az bir ürün belirtilmelidir.",
    });
  }

  const comparison = itemsStore.compareItems(itemIdentifiers, {
    startPeriod: start_period,
    endPeriod: end_period,
  });

  return res.json({
    success: true,
    itemCount: comparison.length,
    data: comparison,
  });
});

/**
 * @route GET /api/v1/items/:item
 * @desc Belirli bir mal/hizmetin (örn: ekmek, pirinc, kira-ucreti) 2015'ten günümüze aylık fiyat geçmişini döner
 */
router.get("/items/:item", (req, res) => {
  const { item } = req.params;
  const { start_period, end_period, start_year, end_year, sort } = req.query;

  const startPeriod = start_period || (start_year ? `${start_year}-01` : undefined);
  const endPeriod = end_period || (end_year ? `${end_year}-12` : undefined);

  const history = itemsStore.getItemHistory(item, {
    startPeriod,
    endPeriod,
    sort: sort === "desc" ? "desc" : "asc",
  });

  if (!history) {
    return res.status(404).json({
      success: false,
      error: `'${item}' isimli sepet kalemi bulunamadı. /api/v1/items adresinden mevcut 520 kalemi inceleyebilirsiniz.`,
    });
  }

  return res.json({
    success: true,
    data: history,
  });
});

/**
 * @route GET /api/v1/prices
 * @desc Belirli bir aydaki tüm sepet fiyatlarının dökümünü getirir
 */
router.get("/prices", (req, res) => {
  const { period, year, month, search, limit, offset } = req.query;

  let targetPeriod = period;
  if (!targetPeriod && year && month) {
    targetPeriod = `${year}-${String(month).padStart(2, "0")}`;
  }

  if (!targetPeriod) {
    const meta = itemsStore.getMeta();
    targetPeriod = meta ? meta.endPeriod : "2024-01";
  }

  const result = itemsStore.getPricesByPeriod(targetPeriod, {
    search: search || "",
    limit: limit !== undefined ? Number(limit) : 50,
    offset: offset !== undefined ? Number(offset) : 0,
  });

  if (!result) {
    return res.status(404).json({
      success: false,
      error: `'${targetPeriod}' dönemine ait sepet fiyat verisi bulunamadı. Veri aralığı: 2015-01 ile 2026-07 arasıdır.`,
    });
  }

  return res.json({
    success: true,
    ...result,
  });
});

export default router;
