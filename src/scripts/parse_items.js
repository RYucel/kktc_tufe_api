import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_PATH = resolve(__dirname, "../../GRETL_TUFE.csv");
const OUTPUT_DATA_PATH = resolve(__dirname, "../../data/items_data.json");
const OUTPUT_META_PATH = resolve(__dirname, "../../data/items_meta.json");

import { slugify } from "../engine/slugify.js";

import { parseItemPricesFromText } from "../engine/csvParser.js";

export { parseItemPricesFromText };

export function parseItemPrices(customCsvPath = CSV_PATH) {
  console.log(`[ItemParser] CSV okunuyor: ${customCsvPath}`);
  const rawContent = readFileSync(customCsvPath, "utf-8");
  const { payload, meta } = parseItemPricesFromText(rawContent);

  writeFileSync(OUTPUT_DATA_PATH, JSON.stringify(payload) + "\n", "utf-8");
  writeFileSync(OUTPUT_META_PATH, JSON.stringify(meta, null, 2) + "\n", "utf-8");

  console.log(`[ItemParser] Başarıyla ayrıştırıldı:`);
  console.log(` - Toplam Kalem: ${payload.items.length}`);
  console.log(` - Dönem Aralığı: ${payload.periods[0]} ile ${payload.periods[payload.periods.length - 1]} arası (${payload.periods.length} ay)`);
  console.log(` - Çıktı: ${OUTPUT_DATA_PATH} ve ${OUTPUT_META_PATH}`);

  return { payload, meta };
}

// Doğrudan çalıştırıldığında işlet
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  parseItemPrices();
}
