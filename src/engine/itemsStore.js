import itemsData from "../../data/items_data.json" with { type: "json" };
import itemsMeta from "../../data/items_meta.json" with { type: "json" };
import { slugify } from "./slugify.js";

export class ItemsStore {
  constructor() {
    this.periods = [];
    this.items = [];
    this.byId = new Map();
    this.byNameLower = new Map();
    this.meta = null;
    this.isInitialized = false;

    // Varsayılan olarak paketlenmiş veriyi doğrudan hafızaya yükle
    this._loadPayload(itemsData, itemsMeta);
    this.isInitialized = true;
  }

  /**
   * Hafızadaki veriyi tazeler (gerektiğinde özel veri enjekte edilebilir)
   */
  async init(injectedData = null, injectedMeta = null) {
    if (injectedData && injectedMeta) {
      this._loadPayload(injectedData, injectedMeta);
    } else {
      this._loadPayload(itemsData, itemsMeta);
    }
    this.isInitialized = true;
  }

  _loadPayload(payload, meta) {
    this.periods = payload.periods || [];
    this.items = payload.items || [];
    this.meta = meta || {
      totalItems: this.items.length,
      totalMonths: this.periods.length,
      startPeriod: this.periods[0] || null,
      endPeriod: this.periods[this.periods.length - 1] || null,
    };

    this.byId.clear();
    this.byNameLower.clear();

    for (const item of this.items) {
      this.byId.set(item.id, item);
      this.byNameLower.set(item.name.toLowerCase().trim(), item);
    }
  }

  getMeta() {
    return this.meta;
  }

  /**
   * Tüm sepet kalemlerini arama, sayfalama ve özet artış bilgisiyle listeler
   */
  getItems({ search = "", limit, offset = 0 } = {}) {
    let result = this.items;

    if (search && search.trim().length > 0) {
      const s = search.toLowerCase().trim();
      const slugSearch = slugify(search);
      result = result.filter(
        (it) => it.name.toLowerCase().includes(s) || it.id.includes(slugSearch)
      );
    }

    const total = result.length;
    const off = Math.max(0, Number(offset) || 0);
    const lim = limit !== undefined ? Math.max(1, Number(limit)) : total;
    const paged = result.slice(off, off + lim);

    const data = paged.map((it) => {
      // Geçerli ilk ve son fiyatı bul (0 olmayan)
      const validPrices = it.prices.filter((p) => p > 0);
      const firstValidPrice = validPrices.length > 0 ? validPrices[0] : 0;
      const latestPrice = it.prices[it.prices.length - 1] || 0;
      const changePct =
        firstValidPrice > 0
          ? Math.round(((latestPrice - firstValidPrice) / firstValidPrice) * 10000) / 100
          : null;

      return {
        id: it.id,
        name: it.name,
        latestPrice,
        latestPeriod: this.periods[this.periods.length - 1],
        firstPrice: firstValidPrice,
        firstPeriod: this.periods[0],
        totalChangePercentage: changePct,
      };
    });

    return {
      total,
      limit: lim,
      offset: off,
      count: data.length,
      data,
    };
  }

  /**
   * ID veya Türkçe isim ile tek bir kalemin zaman serisini döner
   */
  getItemHistory(identifier, { startPeriod, endPeriod, sort = "asc" } = {}) {
    if (!identifier) return null;

    const trimmed = identifier.trim();
    const slug = slugify(trimmed);
    const item =
      this.byId.get(trimmed) ||
      this.byId.get(slug) ||
      this.byNameLower.get(trimmed.toLowerCase());

    if (!item) return null;

    let history = [];
    for (let i = 0; i < this.periods.length; i++) {
      const period = this.periods[i];
      if (startPeriod && period < startPeriod) continue;
      if (endPeriod && period > endPeriod) continue;

      const price = item.prices[i];
      history.push({
        period,
        price,
      });
    }

    // Aylık değişim yüzdelerini hesapla
    for (let i = 0; i < history.length; i++) {
      if (i === 0) {
        history[i].monthlyChangePercentage = null;
      } else {
        const prev = history[i - 1].price;
        const curr = history[i].price;
        if (prev > 0) {
          history[i].monthlyChangePercentage =
            Math.round(((curr - prev) / prev) * 10000) / 100;
        } else {
          history[i].monthlyChangePercentage = null;
        }
      }
    }

    if (sort === "desc") {
      history.reverse();
    }

    // İstatistikler
    const validPrices = history.map((h) => h.price).filter((p) => p > 0);
    const firstPrice = validPrices.length > 0 ? validPrices[0] : 0;
    const latestPrice = validPrices.length > 0 ? validPrices[validPrices.length - 1] : 0;
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
    const totalChangePercentage =
      firstPrice > 0
        ? Math.round(((latestPrice - firstPrice) / firstPrice) * 10000) / 100
        : null;

    return {
      id: item.id,
      name: item.name,
      totalMonths: history.length,
      startPeriod: history[0]?.period || null,
      endPeriod: history[history.length - 1]?.period || null,
      statistics: {
        firstPrice,
        latestPrice,
        minPrice,
        maxPrice,
        totalChangePercentage,
      },
      history,
    };
  }

  /**
   * Belirli bir ayın (ör: 2024-01) tüm sepet madde fiyatlarını döner
   */
  getPricesByPeriod(targetPeriod, { search = "", limit, offset = 0 } = {}) {
    const periodIdx = this.periods.indexOf(targetPeriod);
    if (periodIdx === -1) return null;

    let items = this.items;
    if (search && search.trim().length > 0) {
      const s = search.toLowerCase().trim();
      const slugSearch = slugify(search);
      items = items.filter(
        (it) => it.name.toLowerCase().includes(s) || it.id.includes(slugSearch)
      );
    }

    const total = items.length;
    const off = Math.max(0, Number(offset) || 0);
    const lim = limit !== undefined ? Math.max(1, Number(limit)) : total;
    const paged = items.slice(off, off + lim);

    const prevIdx = periodIdx > 0 ? periodIdx - 1 : -1;

    const data = paged.map((it) => {
      const price = it.prices[periodIdx];
      const prevPrice = prevIdx !== -1 ? it.prices[prevIdx] : null;
      const monthlyChange =
        prevPrice && prevPrice > 0
          ? Math.round(((price - prevPrice) / prevPrice) * 10000) / 100
          : null;

      return {
        id: it.id,
        name: it.name,
        price,
        previousMonthPrice: prevPrice,
        monthlyChangePercentage: monthlyChange,
      };
    });

    return {
      period: targetPeriod,
      previousPeriod: prevIdx !== -1 ? this.periods[prevIdx] : null,
      total,
      limit: lim,
      offset: off,
      count: data.length,
      data,
    };
  }

  /**
   * Birden fazla kalemin fiyat gelişimini karşılaştırır
   */
  compareItems(identifiers, { startPeriod, endPeriod } = {}) {
    if (!Array.isArray(identifiers) || identifiers.length === 0) return [];

    const results = [];
    for (const id of identifiers) {
      const itemData = this.getItemHistory(id, { startPeriod, endPeriod, sort: "asc" });
      if (itemData) {
        results.push({
          id: itemData.id,
          name: itemData.name,
          statistics: itemData.statistics,
          series: itemData.history,
        });
      }
    }

    return results;
  }
}

export const itemsStore = new ItemsStore();
