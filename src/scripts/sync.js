import { fetchTufeData } from "../engine/tufeSource.js";
import { dataStore } from "../engine/dataStore.js";
import { syncItemsFromGithub } from "../engine/syncItemsService.js";

/**
 * Geçici hatalar (ağ kesintisi, GitHub 5xx) senkronizasyonu durdurmaz; veri
 * olduğu gibi kalır ve bir sonraki çalışmada tekrar denenir. Ancak err.fatal
 * işaretli hatalar insan müdahalesi gerektirir (ör. CSV'nin yanlış depoya
 * yüklenmesi) - bunlar sessizce geçilmez, çalışma başarısız olur.
 */
async function main() {
  console.log("==========================================");
  console.log("   KKTC TÜFE & Sepet Veri Senkronizasyonu");
  console.log("==========================================");

  const fatalErrors = [];

  try {
    await dataStore.init();

    console.log("1. Genel TÜFE verisi kktc_tufe veri deposundan çekiliyor...");
    try {
      const { records, meta } = await fetchTufeData(dataStore.getMeta());
      const result = await dataStore.save(records, meta);
      console.log(`✓ Genel TÜFE tamamlandı: ${records.length} kayıt (Değişiklik: ${result.changed ? "EVET" : "HAYIR"}) [${meta.dataSource}]`);
    } catch (tufeErr) {
      if (tufeErr.fatal) fatalErrors.push(tufeErr);
      else console.warn("⚠️ Genel TÜFE uyarısı:", tufeErr.message);
    }

    console.log("\n2. Sepet Madde Fiyatları kktc_tufe veri deposundan çekiliyor...");
    try {
      const itemResult = await syncItemsFromGithub();
      console.log(`✓ Sepet Madde Fiyatları tamamlandı: ${itemResult.itemCount} kalem (${itemResult.startPeriod} - ${itemResult.endPeriod}) (Değişiklik: ${itemResult.changed ? "EVET" : "HAYIR"})`);
    } catch (itemErr) {
      if (itemErr.fatal) fatalErrors.push(itemErr);
      else console.warn("⚠️ Sepet CSV indirme uyarısı:", itemErr.message);
    }

    if (fatalErrors.length > 0) {
      console.error("\n==========================================");
      console.error("   ❌ SENKRONİZASYON DURDURULDU");
      console.error("==========================================");
      for (const err of fatalErrors) {
        console.error(`\n${err.message}`);
        // GitHub Actions özet panelinde kırmızı olarak görünür
        console.error(`::error::${err.message.split("\n")[0]}`);
      }
      process.exit(1);
    }

    console.log("\n==========================================");
    console.log("   Senkronizasyon Başarıyla Tamamlandı!");
    console.log("==========================================");
  } catch (err) {
    console.error("Senkronizasyon sırasında hata oluştu:", err.message);
    process.exit(1);
  }
}

main();
