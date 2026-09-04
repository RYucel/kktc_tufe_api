/**
 * Node.js (self-host) tarafı için basit kullanım sayacı.
 *
 * Edge sürümü Durable Object kullanır; burada tek bir süreç olduğu için
 * hafızada tutmak yeterlidir. Sunucu yeniden başlatıldığında sayaç sıfırlanır
 * (bu davranış /api/v1/stats yanıtında "countingSince" ile açıkça görünür).
 */
class UsageStore {
  constructor() {
    this.counts = new Map();
    this.days = new Map();
    this.firstSeen = null;
  }

  record(path) {
    if (!path) return;
    if (!this.firstSeen) this.firstSeen = new Date().toISOString();

    const day = new Date().toISOString().slice(0, 10);
    this.counts.set(path, (this.counts.get(path) || 0) + 1);
    this.days.set(day, (this.days.get(day) || 0) + 1);
  }

  stats(dayLimit = 30) {
    const endpoints = [...this.counts.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count);

    const daily = [...this.days.entries()]
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, dayLimit)
      .reverse();

    return {
      total: endpoints.reduce((sum, r) => sum + r.count, 0),
      firstSeen: this.firstSeen,
      endpoints,
      daily,
    };
  }

  reset() {
    this.counts.clear();
    this.days.clear();
    this.firstSeen = null;
  }
}

export const usageStore = new UsageStore();
