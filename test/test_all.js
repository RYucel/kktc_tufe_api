import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testSuites = [
  "test_engine.js",
  "test_api.js",
  "test_items.js",
  "test_scheduler.js",
  "test_usage.js",
  "test_worker.js",
];

async function runSuite(file) {
  return new Promise((resolve, reject) => {
    console.log(`\n==================================================`);
    console.log(`▶ ÇALIŞTIRILIYOR: ${file}`);
    console.log(`==================================================`);

    const fullPath = path.join(__dirname, file);
    const child = spawn("node", [fullPath], { stdio: "inherit" });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test paketi başarısız oldu (çıkış kodu: ${code}): ${file}`));
      }
    });

    child.on("error", (err) => reject(err));
  });
}

async function runAll() {
  console.log("🚀 KKTC TÜFE API KAPALI DEVRE (CLOSED-LOOP) TÜM SİSTEM TESTLERİ");
  console.log(`Çalıştırılacak paket sayısı: ${testSuites.length}`);

  for (const suite of testSuites) {
    await runSuite(suite);
  }

  console.log("\n==================================================");
  console.log("🏆 TEBRİKLER! TÜM TEST SÜREÇLERİ EKSİKSİZ BAŞARIYLA TAMAMLANDI!");
  console.log("==================================================");
}

runAll().catch((err) => {
  console.error("\n❌ Test çalıştırma hatası:", err.message);
  process.exit(1);
});
