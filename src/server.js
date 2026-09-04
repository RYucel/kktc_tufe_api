import { createApp } from "./api/app.js";
import { dataStore } from "./engine/dataStore.js";
import { itemsStore } from "./engine/itemsStore.js";
import { initScheduler } from "./engine/scheduler.js";
import { config } from "./config.js";

async function bootstrap() {
  try {
    // 1. Veri motorunu başlat
    console.log("[Bootstrap] Veri motoru yükleniyor...");
    await dataStore.init();
    await itemsStore.init();

    // 2. Express uygulamasını oluştur
    const app = createApp();

    // 3. Sunucuyu dinlemeye başla
    const server = app.listen(config.port, config.host, () => {
      console.log("==================================================");
      console.log(`🚀 KKTC TÜFE API Başlatıldı: http://${config.host}:${config.port}`);
      console.log(`📖 Hızlı Başlangıç Paneli:  http://${config.host}:${config.port}/`);
      console.log(`📚 Swagger Dokümantasyonu: http://${config.host}:${config.port}/docs`);
      console.log(`📋 Sağlık Kontrolü:         http://${config.host}:${config.port}/health`);
      console.log(`📊 Son Enflasyon Verisi:    http://${config.host}:${config.port}/api/v1/latest`);
      console.log("==================================================");
    });

    // 4. Arka plan senkronizasyon zamanlayıcısını başlat
    initScheduler();

    return { app, server };
  } catch (err) {
    console.error("[Bootstrap] Başlatma hatası:", err);
    process.exit(1);
  }
}

// Yalnızca doğrudan çalıştırıldığında dinle
if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  bootstrap();
}

export { bootstrap };
