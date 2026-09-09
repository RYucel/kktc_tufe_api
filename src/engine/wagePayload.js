/**
 * Asgari ücret uçlarının yanıt gövdeleri.
 *
 * Express ve Cloudflare Worker aynı fonksiyonları çağırır; iki çalışma
 * ortamının çıktısı böylece tanım gereği aynı kalır, elle eşitlenmesi
 * gerekmez.
 */

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_LIMIT = 1200;

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function readPeriod(value, name) {
  if (value === undefined || value === null || value === "") return null;
  const period = String(value);
  if (!PERIOD_RE.test(period)) {
    throw badRequest(`Geçersiz ${name}: '${period}'. Biçim 'YYYY-MM' olmalı (örnek: 2024-01).`);
  }
  return period;
}

function readSort(value) {
  const sort = String(value ?? "asc").toLowerCase();
  if (sort !== "asc" && sort !== "desc") {
    throw badRequest(`Geçersiz sort: '${value}'. 'asc' veya 'desc' olmalı.`);
  }
  return sort;
}

function readInt(value, name, { min, max, fallback }) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`Geçersiz ${name}: '${value}'. ${min} ile ${max} arasında bir tam sayı olmalı.`);
  }
  return n;
}

/** Sorgu dizesini tek yerde doğrular; iki çalışma ortamı da bunu kullanır. */
export function parseWageQuery(query = {}) {
  const granularity = String(query.granularity ?? "changes").toLowerCase();
  if (granularity !== "changes" && granularity !== "monthly") {
    throw badRequest(`Geçersiz granularity: '${query.granularity}'. 'changes' veya 'monthly' olmalı.`);
  }
  return {
    granularity,
    from: readPeriod(query.start_period, "start_period"),
    to: readPeriod(query.end_period, "end_period"),
    base: readPeriod(query.base, "base"),
    sort: readSort(query.sort),
    limit: readInt(query.limit, "limit", { min: 1, max: MAX_LIMIT, fallback: null }),
    offset: readInt(query.offset, "offset", { min: 0, max: 100000, fallback: 0 }),
  };
}

function paginate(rows, { limit, offset }) {
  const total = rows.length;
  const start = Math.min(offset, total);
  const end = limit === null ? total : Math.min(start + limit, total);
  return {
    data: rows.slice(start, end),
    pagination: { total, limit: limit ?? total, offset, returned: end - start },
  };
}

export function latestPayload(store) {
  const latest = store.getLatest();
  if (!latest) {
    const err = new Error("Yüklü asgari ücret verisi bulunamadı.");
    err.status = 404;
    throw err;
  }
  return { success: true, data: latest, meta: store.getMeta() };
}

export function seriesPayload(store, query) {
  const q = parseWageQuery(query);
  const rows =
    q.granularity === "monthly"
      ? store.getMonthly({ from: q.from, to: q.to, sort: q.sort })
      : store.getChanges({ from: q.from, to: q.to, sort: q.sort });

  const { data, pagination } = paginate(rows, q);
  return {
    success: true,
    granularity: q.granularity,
    meta: store.getMeta(),
    pagination,
    data,
  };
}

export function realPayload(store, query) {
  const q = parseWageQuery(query);
  const { base, baseCurrency, rows } = store.getReal({
    base: q.base,
    from: q.from,
    to: q.to,
    sort: q.sort,
  });

  const { data, pagination } = paginate(rows, q);
  return {
    success: true,
    base,
    baseCurrency,
    explanation: `Her ayın nominal asgari ücreti, ${base} dönemindeki satın alma gücüne KKTC TÜFE serisiyle çevrilmiştir.`,
    meta: store.getMeta(),
    pagination,
    data,
  };
}
