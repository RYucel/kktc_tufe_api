import { readFile, writeFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { config } from "../config.js";

class DataStore {
  constructor() {
    this.records = [];
    this.meta = null;
    this.byYearMonth = new Map();
    this.byYear = new Map();
    this.isInitialized = false;
  }

  /**
   * Verileri diskten yükleyip hafızada indeksler
   */
  async init() {
    if (!existsSync(config.paths.dataDir)) {
      mkdirSync(config.paths.dataDir, { recursive: true });
    }

    try {
      if (existsSync(config.paths.dataFile)) {
        const rawTufe = await readFile(config.paths.dataFile, "utf-8");
        this.records = JSON.parse(rawTufe);
      } else {
        this.records = [];
      }

      if (existsSync(config.paths.metaFile)) {
        const rawMeta = await readFile(config.paths.metaFile, "utf-8");
        this.meta = JSON.parse(rawMeta);
      } else {
        this.meta = {
          lastChecked: null,
          lastChanged: null,
          recordCount: 0,
        };
      }

      this._rebuildIndexes();
      this.isInitialized = true;
      console.log(`[DataStore] Başarıyla yüklendi: ${this.records.length} kayıt hafızada.`);
    } catch (err) {
      console.error("[DataStore] Yükleme hatası:", err);
      throw err;
    }
  }

  _rebuildIndexes() {
    this.byYearMonth.clear();
    this.byYear.clear();

    // Kronolojik sıralama güvencesi
    this.records.sort((a, b) => a.year - b.year || a.month - b.month);

    for (const rec of this.records) {
      const key = `${rec.year}-${rec.month}`;
      this.byYearMonth.set(key, rec);

      if (!this.byYear.has(rec.year)) {
        this.byYear.set(rec.year, []);
      }
      this.byYear.get(rec.year).push(rec);
    }
  }

  /**
   * Yeni verileri hem diske yazar hem de hafızadaki indeksi günceller
   */
  async save(newRecords, newMeta) {
    const isDifferent = JSON.stringify(this.records) !== JSON.stringify(newRecords);

    this.records = newRecords;
    this._rebuildIndexes();

    this.meta = {
      ...newMeta,
      lastChanged: isDifferent ? new Date().toISOString() : (this.meta?.lastChanged || new Date().toISOString()),
      lastChecked: new Date().toISOString(),
      recordCount: this.records.length,
    };

    await writeFile(config.paths.dataFile, JSON.stringify(this.records, null, 2) + "\n", "utf-8");
    await writeFile(config.paths.metaFile, JSON.stringify(this.meta, null, 2) + "\n", "utf-8");

    return { changed: isDifferent, recordCount: this.records.length };
  }

  getLatest() {
    if (this.records.length === 0) return null;
    return this.records[this.records.length - 1];
  }

  getMeta() {
    return this.meta;
  }

  getByYearMonth(year, month) {
    return this.byYearMonth.get(`${Number(year)}-${Number(month)}`) || null;
  }

  getByYear(year) {
    return this.byYear.get(Number(year)) || [];
  }

  query({ year, month, startYear, endYear, sort = "asc", limit, offset = 0 } = {}) {
    let result = [...this.records];

    if (year !== undefined) {
      result = result.filter((r) => r.year === Number(year));
    }
    if (month !== undefined) {
      result = result.filter((r) => r.month === Number(month));
    }
    if (startYear !== undefined) {
      result = result.filter((r) => r.year >= Number(startYear));
    }
    if (endYear !== undefined) {
      result = result.filter((r) => r.year <= Number(endYear));
    }

    if (sort === "desc") {
      result.reverse();
    }

    const total = result.length;
    const off = Math.max(0, Number(offset) || 0);
    const lim = limit !== undefined ? Math.max(1, Number(limit)) : total;

    const data = result.slice(off, off + lim);

    return {
      total,
      offset: off,
      limit: lim,
      count: data.length,
      data,
    };
  }
}

export const dataStore = new DataStore();
