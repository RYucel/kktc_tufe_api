/**
 * Kılavuzun kapsam rakamlarını tek yerden üretir.
 *
 * Bu nesne üç yerde kuruluyordu (Express portalı, Worker portalı, statik
 * docs/index.html üretimi). Yeni bir alan eklendiğinde biri unutulunca sayfa
 * hata vermeden eski/boş değer gösteriyordu. Üç çağıran da buradan geçer.
 */
export function buildGuideStats({ tufeRecords = [], itemsMeta = {}, wageMeta = {} } = {}) {
  const latest = tufeRecords[tufeRecords.length - 1];
  return {
    recordCount: tufeRecords.length,
    tufeEnd: latest ? `${latest.year}-${String(latest.month).padStart(2, "0")}` : null,
    totalItems: itemsMeta.totalItems ?? null,
    totalMonths: itemsMeta.totalMonths ?? null,
    itemsStart: itemsMeta.startPeriod ?? null,
    itemsEnd: itemsMeta.endPeriod ?? null,
    wageChangeCount: wageMeta.changeCount ?? null,
    wageCurrentAmount: wageMeta.currentAmount ?? null,
    wageCurrentSince: wageMeta.currentSince ?? null,
  };
}
