import { DurableObject } from "cloudflare:workers";

/**
 * API kullanım sayacı (Durable Object + SQLite).
 *
 * Tek bir global örnek olarak çalışır ve Worker isolate'lerinden gelen
 * toplu artışları uygular. İstek başına yazma yapılmaz: Worker tarafı
 * sayıları hafızada biriktirip periyodik olarak buraya gönderir, böylece
 * ücretsiz plandaki günlük satır yazma limiti zorlanmaz.
 */
export class UsageCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;

    // endpoints: uç nokta kalıbı başına toplam (örn "/api/v1/tufe/:year")
    // daily   : gün başına toplam (YYYY-MM-DD)
    // meta    : ilk kayıt zamanı gibi tekil değerler
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS endpoints (
        path  TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS daily (
        day   TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  /**
   * Toplu artış uygular.
   * @param {{counts: Record<string, number>, days: Record<string, number>}} batch
   */
  async record(batch) {
    const counts = batch?.counts || {};
    const days = batch?.days || {};

    for (const [path, n] of Object.entries(counts)) {
      if (!Number.isFinite(n) || n <= 0) continue;
      this.sql.exec(
        `INSERT INTO endpoints (path, count) VALUES (?, ?)
         ON CONFLICT(path) DO UPDATE SET count = count + excluded.count`,
        path,
        n
      );
    }

    for (const [day, n] of Object.entries(days)) {
      if (!Number.isFinite(n) || n <= 0) continue;
      this.sql.exec(
        `INSERT INTO daily (day, count) VALUES (?, ?)
         ON CONFLICT(day) DO UPDATE SET count = count + excluded.count`,
        day,
        n
      );
    }

    // Yazma sayısını gereksiz artırmamak için yalnızca bir kez denenir
    if (!this.firstSeenEnsured) {
      this.sql.exec(
        `INSERT INTO meta (key, value) VALUES ('firstSeen', ?)
         ON CONFLICT(key) DO NOTHING`,
        new Date().toISOString()
      );
      this.firstSeenEnsured = true;
    }

    return { ok: true };
  }

  /**
   * Toplam, uç nokta kırılımı ve son günlerin serisini döner.
   * @param {number} dayLimit Kaç günlük seri dönecek
   */
  async stats(dayLimit = 30) {
    const endpoints = this.sql
      .exec(`SELECT path, count FROM endpoints ORDER BY count DESC`)
      .toArray();

    const daily = this.sql
      .exec(`SELECT day, count FROM daily ORDER BY day DESC LIMIT ?`, dayLimit)
      .toArray();

    const firstSeenRow = this.sql
      .exec(`SELECT value FROM meta WHERE key = 'firstSeen'`)
      .toArray();

    const total = endpoints.reduce((sum, r) => sum + Number(r.count), 0);

    return {
      total,
      firstSeen: firstSeenRow.length > 0 ? firstSeenRow[0].value : null,
      endpoints: endpoints.map((r) => ({ path: r.path, count: Number(r.count) })),
      daily: daily.map((r) => ({ day: r.day, count: Number(r.count) })).reverse(),
    };
  }

  /** Sayacı sıfırlar (yalnızca yönetimsel kullanım). */
  async reset() {
    this.sql.exec(`DELETE FROM endpoints; DELETE FROM daily; DELETE FROM meta;`);
    return { ok: true };
  }
}
