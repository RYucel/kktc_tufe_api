import { fetchTufeData } from "../engine/tufeSource.js";
import { dataStore } from "../engine/dataStore.js";
import { syncItemsFromGithub } from "../engine/syncItemsService.js";

async function main() {
  console.log("==========================================");
  console.log("   KKTC TÜFE & Sepet Veri Senkronizasyonu");
  console.log("==========================================");

  try {
    await dataStore.init();
    console.log("1. Genel TÜFE verisi kktc_tufe veri deposundan çekiliyor...");
    try {
      const { records, meta } = await fetchTufeData(dataStore.getMeta());
      const result = await dataStore.save(records, meta);
      console.log(`✓ Genel TÜFE tamamlandı: ${records.length} kayıt (Değişiklik: ${result.changed ? 'EVET' : 'HAYIR'}) [${meta.dataSource}]`);
    } catch (tufeErr) {
      console.warn("⚠️ Genel TÜFE uyarısı:", tufeErr.message);
    }

    console.log("\n2. Sepet Madde Fiyatları GitHub deposundan çekiliyor...");
    try {
      const itemResult = await syncItemsFromGithub();
      console.log(`✓ Sepet Madde Fiyatları tamamlandı: ${itemResult.itemCount} kalem (${itemResult.startPeriod} - ${itemResult.endPeriod}) (Değişiklik: ${itemResult.changed ? 'EVET' : 'HAYIR'})`);
    } catch (itemErr) {
      console.warn("⚠️ Sepet CSV indirme uyarısı:", itemErr.message);
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
