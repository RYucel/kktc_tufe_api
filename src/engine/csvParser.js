import { slugify } from "./slugify.js";

/**
 * RFC 4180 uyumlu saf JavaScript CSV satır ayrıştırıcı
 */
export function parseCSVLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Ham CSV metnini Cloudflare Workers ve Node.js için ortak ayrıştırır
 */
export function parseItemPricesFromText(rawContent) {
  const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("CSV içeriği en az bir başlık ve bir veri satırı içermelidir.");
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const periods = [];
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const parsedRow = parseCSVLine(lines[i]);
    const rawDate = parsedRow[0]; // e.g. "31/01/2015"
    if (!rawDate) continue;

    const [day, month, year] = rawDate.split("/");
    const period = `${year}-${month.padStart(2, "0")}`;
    periods.push(period);
    rows.push(parsedRow);
  }

  const items = [];
  const usedSlugs = new Map();

  for (let col = 1; col < rawHeaders.length; col++) {
    const originalName = rawHeaders[col];
    if (!originalName || originalName.trim().length === 0) continue;

    let baseSlug = slugify(originalName);
    if (!baseSlug) baseSlug = `madde-${col}`;

    let finalSlug = baseSlug;
    if (usedSlugs.has(baseSlug)) {
      const count = usedSlugs.get(baseSlug) + 1;
      usedSlugs.set(baseSlug, count);
      finalSlug = `${baseSlug}-${count}`;
    } else {
      usedSlugs.set(baseSlug, 1);
    }

    const prices = [];
    for (let r = 0; r < rows.length; r++) {
      const val = parseFloat(rows[r][col]) || 0;
      prices.push(Math.round(val * 10000) / 10000);
    }

    items.push({
      id: finalSlug,
      name: originalName,
      prices,
    });
  }

  const payload = {
    periods,
    itemCount: items.length,
    items,
  };

  const meta = {
    totalItems: items.length,
    totalMonths: periods.length,
    startPeriod: periods[0],
    endPeriod: periods[periods.length - 1],
    generatedAt: new Date().toISOString(),
    source: "KKTC Başbakanlık İstatistik Kurumu - Tüketici Fiyatları Endeksi Madde Fiyatları",
  };

  return { payload, meta };
}
