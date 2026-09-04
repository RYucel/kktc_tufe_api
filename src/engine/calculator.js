/**
 * KKTC TÜFE Finansal ve Kümülatif Hesaplama Motoru
 */

/**
 * Verilen aylık oranlar dizisi için bileşik kümülatif değişim oranını (%) hesaplar.
 * Formül: [ ∏ (1 + r_i / 100) - 1 ] * 100
 * @param {number[]} monthlyRates 
 * @returns {number}
 */
export function compoundRates(monthlyRates) {
  if (!monthlyRates || monthlyRates.length === 0) return 0;
  let multiplier = 1;
  for (const rate of monthlyRates) {
    if (rate !== null && rate !== undefined && !Number.isNaN(rate)) {
      multiplier *= (1 + rate / 100);
    }
  }
  const cumulativePct = (multiplier - 1) * 100;
  return Math.round(cumulativePct * 10000) / 10000;
}

/**
 * Belirli bir yıla ait 1. Dönem (Ocak-Haziran) ve 2. Dönem (Temmuz-Aralık)
 * maaş ve hayat pahalılığı kümülatif oranlarını hesaplar.
 * @param {Array} records Yıla ait veya tüm kayıtlar
 * @param {number} year Hesaplanacak yıl
 */
export function calculateYearPeriods(records, year) {
  const yearRecords = records.filter((r) => r.year === year);
  const byMonth = new Map(yearRecords.map((r) => [r.month, r]));

  // 1. Dönem: Ocak - Haziran (Aylar: 1, 2, 3, 4, 5, 6)
  const p1Rates = [];
  let p1AvailableMonths = 0;
  for (let m = 1; m <= 6; m++) {
    if (byMonth.has(m) && byMonth.get(m).aylikYuzde !== null) {
      p1Rates.push(byMonth.get(m).aylikYuzde);
      p1AvailableMonths++;
    }
  }

  // Eğer Haziran verisi varsa, resmi Haziran yılbaşından bu yana (yilBasindanYuzde) değeri direkt 1. Dönem kümülatifidir.
  const juneRecord = byMonth.get(6);
  const period1Rate = juneRecord && juneRecord.yilBasindanYuzde !== null
    ? juneRecord.yilBasindanYuzde
    : compoundRates(p1Rates);

  // 2. Dönem: Temmuz - Aralık (Aylar: 7, 8, 9, 10, 11, 12)
  const p2Rates = [];
  let p2AvailableMonths = 0;
  for (let m = 7; m <= 12; m++) {
    if (byMonth.has(m) && byMonth.get(m).aylikYuzde !== null) {
      p2Rates.push(byMonth.get(m).aylikYuzde);
      p2AvailableMonths++;
    }
  }
  const period2Rate = compoundRates(p2Rates);

  return {
    year,
    period1: {
      name: "1. Dönem (Ocak - Haziran)",
      isComplete: p1AvailableMonths === 6,
      availableMonths: p1AvailableMonths,
      cumulativeRate: period1Rate,
      officialJuneYtd: juneRecord ? juneRecord.yilBasindanYuzde : null,
    },
    period2: {
      name: "2. Dönem (Temmuz - Aralık)",
      isComplete: p2AvailableMonths === 6,
      availableMonths: p2AvailableMonths,
      cumulativeRate: period2Rate,
      calculationMethod: "Temmuz-Aralık aylık oranlarının bileşik çarpımı",
    },
    annualTotal: {
      availableTotalMonths: p1AvailableMonths + p2AvailableMonths,
      decemberYtd: byMonth.get(12) ? byMonth.get(12).yilBasindanYuzde : null,
      compoundedAnnual: compoundRates([...p1Rates, ...p2Rates]),
    },
  };
}

/**
 * İki tarih arasındaki kümülatif enflasyonu ve girilen tutarın bugünkü/hedef tarihteki karşılığını hesaplar.
 * @param {Array} allRecords Tüm TÜFE kayıtları (kronolojik sıralı)
 * @param {number} startYear Başlangıç yılı
 * @param {number} startMonth Başlangıç ayı
 * @param {number} endYear Bitiş yılı
 * @param {number} endMonth Bitiş ayı
 * @param {number} [amount=100] Değerlenecek para tutarı
 */
export function calculateInflationBetween(allRecords, startYear, startMonth, endYear, endMonth, amount = 100) {
  const startKey = startYear * 100 + startMonth;
  const endKey = endYear * 100 + endMonth;

  if (startKey > endKey) {
    throw new Error("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
  }

  // Başlangıç ayından sonraki ayların enflasyonu birikir (veya başlangıç ayının kendi enflasyonu dahil seçeneği)
  // Finansal standart: startMonth'tan endMonth'a kadar olan değişimler
  const targetRecords = allRecords.filter((r) => {
    const k = r.year * 100 + r.month;
    return k >= startKey && k <= endKey;
  });

  if (targetRecords.length === 0) {
    throw new Error("Seçilen tarih aralığında veri bulunamadı.");
  }

  const monthlyRates = targetRecords.map((r) => r.aylikYuzde);
  const cumulativePercentage = compoundRates(monthlyRates);
  const multiplier = 1 + cumulativePercentage / 100;
  const revaluedAmount = Math.round(amount * multiplier * 100) / 100;
  const purchasingPowerRatio = Math.round((1 / multiplier) * 10000) / 10000;

  return {
    query: {
      startDate: `${startYear}-${String(startMonth).padStart(2, "0")}`,
      endDate: `${endYear}-${String(endMonth).padStart(2, "0")}`,
      initialAmount: amount,
    },
    result: {
      monthCount: targetRecords.length,
      cumulativeInflationPct: cumulativePercentage,
      multiplier: Math.round(multiplier * 10000) / 10000,
      revaluedAmount,
      purchasingPowerRatio,
      note: `${startYear}-${startMonth} dönemindeki ${amount.toLocaleString("tr-TR")} TL, ${endYear}-${endMonth} döneminde ${revaluedAmount.toLocaleString("tr-TR")} TL tutarına eşdeğerdir.`,
    },
  };
}
