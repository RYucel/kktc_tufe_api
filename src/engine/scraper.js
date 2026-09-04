import XLSX from "xlsx";
import { config } from "../config.js";

const MONTHS = [
  "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN",
  "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK",
];

const MONTH_INDEX = new Map(MONTHS.map((m, i) => [m, i + 1]));

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": config.sources.userAgent },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} alindi: ${url}`);
  }
  return res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": config.sources.userAgent },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} alindi: ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const grab = (tag) => {
      const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`);
      const mm = block.match(re);
      return mm ? mm[1].trim() : "";
    };
    items.push({
      title: grab("title"),
      link: grab("link"),
      pubDate: grab("pubDate"),
      description: grab("description"),
    });
  }
  return items;
}

function findLatestTufeItem(items) {
  // "Tüketici Fiyat Endeksi - <Ay> <Yıl>" başlıklarını eşleştirir
  const re = /^T[üu]ketici Fiyat Endeksi\s*-\s*(\S+)\s+(\d{4})$/i;
  const candidates = items
    .map((it) => ({ it, mm: it.title.match(re) }))
    .filter((x) => x.mm);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => new Date(b.it.pubDate).getTime() - new Date(a.it.pubDate).getTime());
  return candidates[0];
}

async function findArchiveXlsUrl(newsPageUrl) {
  const html = await fetchText(newsPageUrl);
  const m = html.match(/https?:\/\/istatistik\.gov\.ct\.tr\/Portals\/\d+\/TUFE_ARSIV[^"'\s]+\.xls/i);
  if (!m) {
    throw new Error(`Resmi arşiv .xls linki sayfada bulunamadı: ${newsPageUrl}`);
  }
  return m[0];
}

function sheetToMap(sheet, firstYear, colStart = 1) {
  const map = new Map();
  const ref = sheet["!ref"];
  if (!ref) return map;

  const range = XLSX.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r++) {
    const labelCell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    const label = labelCell ? String(labelCell.v).trim().toUpperCase() : "";
    if (!MONTH_INDEX.has(label)) continue;
    const monthNum = MONTH_INDEX.get(label);

    for (let c = colStart; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v === "" || cell.v === undefined || cell.v === null) continue;
      const year = firstYear + (c - colStart);
      const val = Number(cell.v);
      if (Number.isNaN(val)) continue;
      map.set(`${year}-${monthNum}`, Math.round(val * 10000) / 10000);
    }
  }
  return map;
}

function buildRecordsFromWorkbook(workbook) {
  const [sh0, sh1, sh2] = workbook.SheetNames.slice(0, 3).map((n) => workbook.Sheets[n]);
  const aylik = sheetToMap(sh0, 1977);
  const ytd = sheetToMap(sh1, 1978);
  const yillik = sheetToMap(sh2, 1978);

  const keys = new Set([...aylik.keys(), ...ytd.keys(), ...yillik.keys()]);
  const records = [...keys].map((key) => {
    const [year, month] = key.split("-").map(Number);
    return {
      year,
      month,
      aylikYuzde: aylik.has(key) ? aylik.get(key) : null,
      yilBasindanYuzde: ytd.has(key) ? ytd.get(key) : null,
      yillikYuzde: yillik.has(key) ? yillik.get(key) : null,
    };
  });

  records.sort((a, b) => a.year - b.year || a.month - b.month);
  return records;
}

/**
 * Resmi KKTC İstatistik Kurumu bülten ve arşivini tarayıp parse eder.
 */
export async function scrapeTufeData() {
  const rssXml = await fetchText(config.sources.rssUrl);
  const items = parseRssItems(rssXml);
  const latest = findLatestTufeItem(items);
  if (!latest) {
    throw new Error("RSS akışı içinde geçerli TÜFE haberi bulunamadı.");
  }

  const archiveUrl = await findArchiveXlsUrl(latest.it.link);
  const buffer = await fetchBuffer(archiveUrl);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const records = buildRecordsFromWorkbook(workbook);

  const meta = {
    lastChecked: new Date().toISOString(),
    latestHeadline: latest.it.title,
    latestNewsUrl: latest.it.link,
    latestPubDate: latest.it.pubDate,
    archiveUrl,
    recordCount: records.length,
    startPeriod: records.length > 0 ? `${records[0].year}-${String(records[0].month).padStart(2, "0")}` : null,
    endPeriod: records.length > 0 ? `${records[records.length - 1].year}-${String(records[records.length - 1].month).padStart(2, "0")}` : null,
  };

  return { records, meta };
}
