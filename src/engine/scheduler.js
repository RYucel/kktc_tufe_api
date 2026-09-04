import cron from "node-cron";
import { config } from "../config.js";
import { scrapeTufeData } from "./scraper.js";
import { dataStore } from "./dataStore.js";
import { syncItemsFromGithub } from "./syncItemsService.js";

let task = null;

export function initScheduler() {
  if (task) {
    console.log("[Scheduler] Zamanlayıcı zaten aktif.");
    return task;
  }

  const scheduleExpression = config.cronSchedule;
  console.log(`[Scheduler] Otomatik senkronizasyon zamanlayıcısı başlatılıyor: "${scheduleExpression}"`);

  task = cron.schedule(
    scheduleExpression,
    async () => {
      console.log(`[Scheduler] [${new Date().toISOString()}] Zamanlanmış güncelleme çalıştırılıyor...`);

      // 1. Genel TÜFE serisi (resmi RSS + arşiv XLS)
      try {
        const { records, meta } = await scrapeTufeData();
        const result = await dataStore.save(records, meta);
        console.log(`[Scheduler] TÜFE: ${result.changed ? 'Yeni veri tespit edildi' : 'Değişiklik yok'}, Toplam: ${result.recordCount} kayıt.`);
      } catch (err) {
        console.error("[Scheduler] TÜFE güncelleme hatası:", err.message);
      }

      // 2. Sepet madde fiyatları (GitHub'a elle yüklenen GRETL_TUFE.csv)
      // Ayrı try/catch: birinin hatası diğerini engellemez.
      try {
        const items = await syncItemsFromGithub();
        console.log(`[Scheduler] Sepet: ${items.changed ? `Güncellendi -> ${items.endPeriod}` : 'Değişiklik yok'}, ${items.itemCount} kalem / ${items.periodCount} ay.`);
      } catch (err) {
        console.error("[Scheduler] Sepet güncelleme hatası:", err.message);
      }
    },
    {
      timezone: "UTC",
    }
  );

  return task;
}

export function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
    console.log("[Scheduler] Zamanlayıcı durduruldu.");
  }
}
