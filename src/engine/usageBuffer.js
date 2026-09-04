/**
 * Worker isolate'i içinde çalışan kullanım tamponu.
 *
 * Tasarım notu: Sayılar isolate belleğinde uzun süre biriktirilmez. Bir
 * isolate her an sonlandırılabilir ve o ana kadar biriken sayılar kaybolur;
 * düşük trafikli bir API'de bu, sayacın çoğu isteği hiç görmemesi anlamına
 * gelir. Bu yüzden her istek waitUntil() içinde Durable Object'e yazılır:
 * yanıt gecikmesi artmaz, sayım da kaybolmaz.
 *
 * Tampon yine de kullanılır; aynı olay döngüsü turunda gelen istekler tek
 * bir toplu çağrıda birleşir ve yazma sayısı azalır.
 */

let counts = {};
let days = {};
let pending = 0;
let inFlight = null;

export function resetBuffer() {
  counts = {};
  days = {};
  pending = 0;
  inFlight = null;
}

export function bufferState() {
  return { pending, counts: { ...counts }, days: { ...days } };
}

function drain() {
  // Not: prototipsiz nesneler (Object.create(null)) Workers RPC serilestirmesinde
  // "Could not serialize object of type Object" hatasi verir; batch daima duz nesne.
  const batch = { counts, days };
  counts = {};
  days = {};
  pending = 0;
  return batch;
}

/**
 * Bir isteği sayar ve Durable Object'e yazılmasını planlar.
 * @param {string} path Normalize edilmiş uç nokta kalıbı
 * @param {object|undefined} stub Durable Object stub'ı (yoksa yalnız tamponlanır)
 * @param {{waitUntil?: Function}|undefined} execCtx
 */
export function track(path, stub, execCtx) {
  if (!path) return;

  const day = new Date().toISOString().slice(0, 10);
  counts[path] = (counts[path] || 0) + 1;
  days[day] = (days[day] || 0) + 1;
  pending++;

  if (!stub) return;

  // Aynı tur içinde gelen istekleri tek yazmada birleştir: mikro görev
  // kuyruğunun sonuna ertele, bu sırada biriken her şey aynı batch'e girer.
  if (inFlight) return;

  inFlight = Promise.resolve().then(() => {
    inFlight = null;
    if (pending === 0) return;
    // Sayaç hatası hiçbir koşulda API yanıtını etkilememeli
    return Promise.resolve(stub.record(drain())).catch(() => {});
  });

  if (execCtx && typeof execCtx.waitUntil === "function") {
    execCtx.waitUntil(inFlight);
  }
}

/**
 * Bekleyen sayıları koşulsuz yazar (ör. /stats okunmadan hemen önce).
 */
export async function flush(stub) {
  if (!stub || pending === 0) return;
  try {
    await stub.record(drain());
  } catch {
    // sessizce yut: sayaç asla API'yi bozmamalı
  }
}
