import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { SOURCE_RSS_URL, ITEMS_CSV_SOURCE_URL } from "./constants.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || "0.0.0.0",
  apiKey: process.env.API_KEY || "kktc_tufe_secret_key_2026",
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 dakika
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "120", 10), // 120 istek / dakika
  cronSchedule: process.env.CRON_SCHEDULE || "0 9 * * *", // Her gün 09:00 UTC (TÜFE bülteni + sepet CSV kontrolü)
  paths: {
    root: ROOT_DIR,
    dataDir: path.join(ROOT_DIR, "data"),
    dataFile: path.join(ROOT_DIR, "data", "tufe.json"),
    metaFile: path.join(ROOT_DIR, "data", "meta.json"),
    itemsDataFile: path.join(ROOT_DIR, "data", "items_data.json"),
    itemsMetaFile: path.join(ROOT_DIR, "data", "items_meta.json"),
    itemsCsvFile: path.join(ROOT_DIR, "GRETL_TUFE.csv"),
  },
  sources: {
    rssUrl: process.env.RSS_URL || SOURCE_RSS_URL,
    githubItemsCsvUrl: process.env.GITHUB_ITEMS_CSV_URL || ITEMS_CSV_SOURCE_URL,
    userAgent: process.env.USER_AGENT || "Mozilla/5.0 (compatible; KKTC-TUFE-API/1.0; +https://github.com/)",
  },
};
