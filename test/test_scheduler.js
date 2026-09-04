import assert from "node:assert/strict";
import { initScheduler, stopScheduler } from "../src/engine/scheduler.js";

async function testScheduler() {
  console.log("=== FAZ 4 ZAMANLAYICI (SCHEDULER) TESTİ ===");

  console.log("[Test 1] Scheduler başlatma...");
  const task = initScheduler();
  assert.ok(task, "Cron görevi oluşturulmalıdır.");
  console.log("✓ Zamanlayıcı başarıyla başlatıldı.");

  console.log("[Test 2] Tekrar çağırmada idempotentlik...");
  const task2 = initScheduler();
  assert.equal(task, task2, "Zamanlayıcı tekil (singleton) olmalıdır.");
  console.log("✓ Singleton zamanlayıcı doğrulandı.");

  console.log("[Test 3] Scheduler durdurma...");
  stopScheduler();
  console.log("✓ Zamanlayıcı başarıyla durduruldu.");

  console.log("\n🎉 FAZ 4 ZAMANLAYICI TESTİ BAŞARIYLA GEÇTİ!");
}

testScheduler().catch((err) => {
  console.error("Zamanlayıcı Test Hatası:", err);
  process.exit(1);
});
