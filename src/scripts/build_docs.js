/**
 * docs/index.html dosyasini guide.js'ten yeniden uretir.
 *
 * Kilavuzun statik kopyasi (GitHub Pages icin) elle tutuldugunda canli
 * portaldan sapiyordu. Bu script tek kaynaktan (src/views/guide.js) uretir.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { renderGuideHtml } from "../views/guide.js";
import { buildGuideStats } from "../views/guideStats.js";
import { wageStore } from "../engine/wageStore.js";
import { config } from "../config.js";
import tufeData from "../../data/tufe.json" with { type: "json" };
import itemsMeta from "../../data/items_meta.json" with { type: "json" };

export function buildDocs() {
  wageStore.init(tufeData);
  const html = renderGuideHtml({
    stats: buildGuideStats({
      tufeRecords: tufeData,
      itemsMeta,
      wageMeta: wageStore.getMeta(),
    }),
  });

  const outPath = path.join(config.paths.root, "docs", "index.html");
  writeFileSync(outPath, html, "utf-8");

  console.log(`[BuildDocs] docs/index.html yeniden uretildi (${Buffer.byteLength(html)} byte)`);
  console.log(`[BuildDocs] Kapsam: ${tufeData.length} TUFE kaydi | ${itemsMeta.totalItems} kalem / ${itemsMeta.totalMonths} ay (${itemsMeta.endPeriod})`);
  return html;
}

if (process.argv[1] && process.argv[1].endsWith("build_docs.js")) {
  buildDocs();
}
