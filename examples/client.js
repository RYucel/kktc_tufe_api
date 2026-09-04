/**
 * KKTC TÜFE API - JavaScript / Node.js Örnek İstemci
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

async function main() {
  console.log("=== KKTC TÜFE API - JavaScript Örneği ===");

  // 1. En güncel enflasyon verisini çek
  console.log("\n1. En son enflasyon verisi çekiliyor...");
  const latestRes = await fetch(`${BASE_URL}/api/v1/latest`);
  const latestJson = await latestRes.json();
  console.log(`Son Ay: ${latestJson.data.monthName} ${latestJson.data.year}`);
  console.log(`Aylık Değişim: %${latestJson.data.aylikYuzde}`);
  console.log(`Yıllık Enflasyon: %${latestJson.data.yillikYuzde}`);

  // 2. KKTC 6 Aylık Hayat Pahalılığı (Maaş Artış) Dönemlerini Çek
  console.log("\n2. 2024 yılı KKTC hayat pahalılığı dönemleri çekiliyor...");
  const periodsRes = await fetch(`${BASE_URL}/api/v1/periods?year=2024`);
  const periodsJson = await periodsRes.json();
  console.log(`1. Dönem (Ocak-Haziran): %${periodsJson.data.period1.cumulativeRate}`);
  console.log(`2. Dönem (Temmuz-Aralık): %${periodsJson.data.period2.cumulativeRate}`);

  // 3. Enflasyon Alım Gücü Değerleme Hesaplaması
  console.log("\n3. 10.000 TL'nin 2022'den 2024'e değer değişimi hesaplanıyor...");
  const calcRes = await fetch(`${BASE_URL}/api/v1/calculate?start_year=2022&start_month=1&end_year=2024&end_month=12&amount=10000`);
  const calcJson = await calcRes.json();
  console.log(calcJson.result.note);
  console.log(`Toplam Bileşik Enflasyon: %${calcJson.result.cumulativeInflationPct}`);
}

main().catch(console.error);
