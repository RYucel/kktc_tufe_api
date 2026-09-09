import wageDoc from "../../data/wage.json" with { type: "json" };

/**
 * KKTC brüt asgari ücret motoru.
 *
 * Kaynak veri (data/wage.json) YALNIZCA nominal ücret kararlarını tutar; yılda
 * iki kez elle güncellenir. Reel (enflasyondan arındırılmış) değerler burada
 * saklanmaz, API'nin kendi TÜFE serisinden hesaplanır. Böylece TÜFE her
 * güncellendiğinde reel seri kendiliğinden tutarlı kalır ve aynı endeks iki
 * ayrı yerde tutulmuş olmaz.
 */

const MONTH_NAMES = [
  "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function periodOf(rec) {
  return `${rec.year}-${String(rec.month).padStart(2, "0")}`;
}

function nextPeriod(period) {
  let [y, m] = period.split("-").map(Number);
  if (++m > 12) { m = 1; y++; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Dönemler sıfır dolgulu olduğu için sözlük sırası = kronolojik sıra. */
function inRange(period, from, to) {
  return (!from || period >= from) && (!to || period <= to);
}

function round(value, digits) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/**
 * Elle düzenlenen dosyada bir hata varsa (sıra bozuk, dönem tekrarlı, tutar
 * negatif) bunu sessizce yanlış rakam üretmek yerine açılışta patlatmak
 * gerekir; veri elle girildiği için tek savunma budur.
 */
function assertChangesAreSane(changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error("wage.json: 'changes' boş olamaz.");
  }
  let prev = null;
  for (const [i, c] of changes.entries()) {
    const at = `changes[${i}] (${c?.effectiveFrom ?? "?"})`;
    if (!PERIOD_RE.test(String(c?.effectiveFrom))) {
      throw new Error(`wage.json: ${at} effectiveFrom 'YYYY-MM' biçiminde olmalı.`);
    }
    if (!Number.isFinite(c.amount) || c.amount <= 0) {
      throw new Error(`wage.json: ${at} amount pozitif bir sayı olmalı.`);
    }
    if (prev && c.effectiveFrom <= prev) {
      throw new Error(
        `wage.json: ${at} kronolojik sırada değil (önceki: ${prev}). Dönemler artan ve tekrarsız olmalı.`
      );
    }
    prev = c.effectiveFrom;
  }
}

export class WageStore {
  constructor() {
    this.changes = [];
    this.currency = null;
    this.source = null;
    this.index = new Map(); // dönem -> zincirlenmiş TÜFE endeksi
    this.indexStart = null;
    this.tufeEnd = null;
    this.isInitialized = false;
  }

  /**
   * @param {Array} tufeRecords dataStore.records ile aynı şekle sahip TÜFE dizisi
   */
  init(tufeRecords = [], doc = wageDoc) {
    assertChangesAreSane(doc.changes);

    this.currency = doc.currency;
    this.source = doc.source;
    this.changes = doc.changes.map((c) => ({
      effectiveFrom: c.effectiveFrom,
      amount: c.amount,
      // Devalüasyon öncesi ve sonrası tutarlar doğrudan karşılaştırılamaz; tüm
      // aritmetik tek birimde (eski TL) yapılır, sunumda geri çevrilir.
      amountTRL: c.amount * this._factorAt(c.effectiveFrom),
      currency: c.effectiveFrom >= this.currency.redenominationFrom ? "TRY" : "TRL",
      ...(c.blended ? { blended: true } : {}),
    }));

    this._buildIndex(tufeRecords);
    this.isInitialized = true;
    return this;
  }

  _factorAt(period) {
    return period >= this.currency.redenominationFrom ? this.currency.factor : 1;
  }

  /**
   * Yayımlanan aylık yüzdeleri zincirleyerek fiyat endeksi kurar (taban 100,
   * ilk kaydın bir öncesi). Mutlak seviye önemsizdir; yalnızca iki dönem
   * arasındaki ORAN kullanılır, o da taban seçiminden bağımsızdır.
   */
  _buildIndex(records) {
    this.index.clear();
    const sorted = [...records].sort((a, b) => a.year - b.year || a.month - b.month);
    let level = 100;
    for (const rec of sorted) {
      level *= 1 + rec.aylikYuzde / 100;
      this.index.set(periodOf(rec), level);
    }
    this.indexStart = sorted.length ? periodOf(sorted[0]) : null;
    this.tufeEnd = sorted.length ? periodOf(sorted[sorted.length - 1]) : null;
  }

  getMeta() {
    const latest = this.changes[this.changes.length - 1];
    return {
      changeCount: this.changes.length,
      startPeriod: this.changes[0]?.effectiveFrom ?? null,
      currentSince: latest?.effectiveFrom ?? null,
      currentAmount: latest?.amount ?? null,
      currency: latest?.currency ?? null,
      seriesEnd: this.tufeEnd,
      source: this.source,
      note: "Brüt asgari ücret. Nominal tutarlar elle güncellenir; reel değerler API'nin TÜFE serisinden hesaplanır.",
    };
  }

  /** Verilen dönemde yürürlükte olan ücret kaydı (ileri doldurma). */
  wageAt(period) {
    let found = null;
    for (const c of this.changes) {
      if (c.effectiveFrom > period) break;
      found = c;
    }
    return found;
  }

  getLatest() {
    const c = this.changes[this.changes.length - 1];
    if (!c) return null;
    const [y, m] = c.effectiveFrom.split("-").map(Number);
    return {
      effectiveFrom: c.effectiveFrom,
      year: y,
      month: m,
      monthName: MONTH_NAMES[m],
      amount: c.amount,
      currency: c.currency,
      monthsInEffect: this.tufeEnd ? this._monthsBetween(c.effectiveFrom, this.tufeEnd) + 1 : null,
      previous: this._previousSummary(),
    };
  }

  _monthsBetween(a, b) {
    const [y1, m1] = a.split("-").map(Number);
    const [y2, m2] = b.split("-").map(Number);
    return (y2 - y1) * 12 + (m2 - m1);
  }

  _previousSummary() {
    const n = this.changes.length;
    if (n < 2) return null;
    const cur = this.changes[n - 1];
    const prev = this.changes[n - 2];
    return {
      effectiveFrom: prev.effectiveFrom,
      amount: prev.amount,
      currency: prev.currency,
      nominalIncreasePercent: round((cur.amountTRL / prev.amountTRL - 1) * 100, 2),
      // Zam, önceki ücretin yürürlükte olduğu sürede biriken enflasyonu aştı mı?
      realIncreasePercent: this._realChangePercent(prev, cur),
    };
  }

  _realChangePercent(from, to) {
    const iFrom = this.index.get(from.effectiveFrom);
    const iTo = this.index.get(to.effectiveFrom);
    if (!iFrom || !iTo) return null;
    return round(((to.amountTRL / iTo) / (from.amountTRL / iFrom) - 1) * 100, 2);
  }

  /** Ücret kararları: yalnızca değişim noktaları. */
  getChanges({ from = null, to = null, sort = "asc" } = {}) {
    const rows = this.changes
      .filter((c) => inRange(c.effectiveFrom, from, to))
      .map((c, i, arr) => ({
        effectiveFrom: c.effectiveFrom,
        amount: c.amount,
        currency: c.currency,
        ...(c.blended ? { blended: true } : {}),
        nominalIncreasePercent:
          i > 0 ? round((c.amountTRL / arr[i - 1].amountTRL - 1) * 100, 2) : null,
      }));
    return sort === "desc" ? rows.reverse() : rows;
  }

  /**
   * Aylık seri: her ay için yürürlükteki ücret, ileri doldurma ile.
   * TÜFE serisinin bittiği ayda durur.
   */
  getMonthly({ from = null, to = null, sort = "asc" } = {}) {
    const start = this.changes[0]?.effectiveFrom;
    const end = this.tufeEnd;
    if (!start || !end) return [];

    const rows = [];
    for (let p = start; p <= end; p = nextPeriod(p)) {
      if (!inRange(p, from, to)) continue;
      const w = this.wageAt(p);
      if (!w) continue;
      const [y, m] = p.split("-").map(Number);
      rows.push({
        period: p,
        year: y,
        month: m,
        monthName: MONTH_NAMES[m],
        amount: w.amount,
        currency: w.currency,
        effectiveFrom: w.effectiveFrom,
      });
    }
    return sort === "desc" ? rows.reverse() : rows;
  }

  /**
   * Reel asgari ücret: her ayın nominal ücreti, taban dönemin satın alma
   * gücüne çevrilir. Sonuç TABAN DÖNEMİN para biriminde ifade edilir.
   *
   *   reel(p) = nominal(p) * endeks(taban) / endeks(p)
   */
  getReal({ base = null, from = null, to = null, sort = "asc" } = {}) {
    const basePeriod = base || this.tufeEnd;
    if (!basePeriod) return { base: null, baseCurrency: null, rows: [] };
    if (!PERIOD_RE.test(basePeriod)) {
      const err = new Error(`Geçersiz taban dönem: '${basePeriod}'. Biçim 'YYYY-MM' olmalı.`);
      err.status = 400;
      throw err;
    }
    const baseIndex = this.index.get(basePeriod);
    if (!baseIndex) {
      const err = new Error(
        `Taban dönem '${basePeriod}' TÜFE serisinde yok. Kapsam: ${this.indexStart} - ${this.tufeEnd}.`
      );
      err.status = 400;
      throw err;
    }
    const baseFactor = this._factorAt(basePeriod);

    const rows = this.getMonthly({ from, to }).map((r) => {
      const idx = this.index.get(r.period);
      const w = this.wageAt(r.period);
      return {
        period: r.period,
        year: r.year,
        month: r.month,
        monthName: r.monthName,
        nominalAmount: r.amount,
        nominalCurrency: r.currency,
        realAmount: idx ? round((w.amountTRL * baseIndex) / idx / baseFactor, 2) : null,
      };
    });

    return {
      base: basePeriod,
      baseCurrency: basePeriod >= this.currency.redenominationFrom ? "TRY" : "TRL",
      rows: sort === "desc" ? rows.reverse() : rows,
    };
  }
}

export const wageStore = new WageStore();
