/**
 * Veri tazeliği: sepet madde fiyatları, genel TÜFE serisinin kaç ay gerisinde?
 *
 * Neden gerekti: Genel TÜFE cron ile otomatik güncellenir, sepet madde
 * fiyatları ise elle yüklenir. Bu yüzden TÜFE yeni aya geçtiği anda iki seri
 * arasında bir pencere açılır. 6 Ekim 2026'da bu pencere 6 saat 23 dakika
 * sürdü (TÜFE 01:11 UTC'de Eylül'e geçti, sepet 07:34'te yetişti) ve o süre
 * boyunca iki uç nokta da farkı hiç belirtmeden "sağlıklı" dedi. Pencere
 * kısaydı ama görünmezdi: atlanan bir yükleme aynı sessizlikle aylarca
 * sürebilirdi. Bu modül farkı tek bir sayıya indirip yayınlar.
 *
 * Durumlar:
 *   current - iki seri aynı ayda, yapılacak bir şey yok
 *   pending - sepet 1 ay geride. TÜFE yeni yayımlandığında BEKLENEN geçiş
 *             hâli; CSV yüklenince kapanır. Hata değil, hatırlatmadır.
 *   stale   - sepet 2 veya daha fazla ay geride. Bir yükleme atlanmış.
 *   ahead   - sepet TÜFE'den ileride. Kurum sepeti yayımlamış ama TÜFE
 *             bülteni henüz çıkmamış olabilir.
 *   unknown - serilerden biri yüklenmemiş.
 */

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthsBetween(from, to) {
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

export function computeFreshness({ tufeEnd = null, itemsEnd = null } = {}) {
  const gecerli = (p) => typeof p === "string" && PERIOD_RE.test(p);

  if (!gecerli(tufeEnd) || !gecerli(itemsEnd)) {
    return {
      status: "unknown",
      tufeEnd: gecerli(tufeEnd) ? tufeEnd : null,
      itemsEnd: gecerli(itemsEnd) ? itemsEnd : null,
      itemsLagMonths: null,
      note: "Serilerden biri yüklenmediği için tazelik karşılaştırması yapılamadı.",
    };
  }

  const lag = monthsBetween(itemsEnd, tufeEnd);

  let status;
  let note;
  if (lag < 0) {
    status = "ahead";
    note =
      `Sepet madde fiyatları (${itemsEnd}) genel TÜFE serisinden (${tufeEnd}) ` +
      `${-lag} ay ileride. TÜFE bülteni henüz yayımlanmamış olabilir.`;
  } else if (lag === 0) {
    status = "current";
    note = `Sepet madde fiyatları ve genel TÜFE aynı dönemde (${tufeEnd}).`;
  } else if (lag === 1) {
    status = "pending";
    note =
      `Genel TÜFE ${tufeEnd} dönemine geçti, sepet madde fiyatları ${itemsEnd} ` +
      `döneminde. Yeni GRETL_TUFE.csv kaynak depoya yüklendiğinde kapanır: ` +
      `https://github.com/RYucel/kktc_tufe`;
  } else {
    status = "stale";
    note =
      `Sepet madde fiyatları genel TÜFE serisinin ${lag} ay gerisinde ` +
      `(${itemsEnd} / ${tufeEnd}). Bir CSV yüklemesi atlanmış olabilir: ` +
      `https://github.com/RYucel/kktc_tufe`;
  }

  return { status, tufeEnd, itemsEnd, itemsLagMonths: lag, note };
}
