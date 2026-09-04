import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { config } from "../config.js";
import { swaggerSpec } from "./docs/swaggerSpec.js";
import { renderGuideHtml } from "../views/guide.js";
import { dataStore } from "../engine/dataStore.js";
import { itemsStore } from "../engine/itemsStore.js";

import tufeRouter from "./routes/tufe.js";
import periodsRouter from "./routes/periods.js";
import calculateRouter from "./routes/calculate.js";
import metaRouter from "./routes/meta.js";
import syncRouter from "./routes/sync.js";
import itemsRouter from "./routes/items.js";

export function createApp() {
  const app = express();

  // Güvenlik Başlıkları
  app.use(
    helmet({
      contentSecurityPolicy: false, // Swagger UI ve HTML önizleme için
    })
  );

  // CORS (Açık kaynak geliştiriciler için tüm kaynaklara izin verilir)
  app.use(cors());

  // JSON Body Parser
  app.use(express.json());

  // OpenAPI JSON Şeması
  app.get("/api/openapi.json", (req, res) => {
    res.json(swaggerSpec);
  });

  // Swagger UI Dokümantasyonu (Temiz, Yüksek Okunabilirlikli Açık Tema)
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: `
        .swagger-ui .topbar { display: none; }
        body { background: #f8fafc; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
        .swagger-ui .info { margin: 25px 0 15px; }
        .swagger-ui .info .title { color: #0f172a; font-weight: 800; font-size: 28px; }
        .swagger-ui .info p, .swagger-ui .info li { color: #334155; font-size: 15px; line-height: 1.6; }
        .swagger-ui .info .description { color: #334155; }
        .swagger-ui .scheme-container { background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 8px; margin: 15px 0; padding: 15px; }
        .swagger-ui .opblock { border-radius: 8px; margin-bottom: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
        .swagger-ui .opblock .opblock-summary { padding: 10px 15px; }
        .swagger-ui .opblock .opblock-summary-path { font-weight: 700; color: #0f172a; }
        .swagger-ui .btn.authorize { color: #059669; border-color: #059669; }
        .swagger-ui .btn.authorize svg { fill: #059669; }
      `,
      customSiteTitle: "KKTC TÜFE API - İnteraktif Dokümantasyon",
    })
  );

  // Hız Sınırlaması (Rate Limiting)
  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin.",
    },
  });
  app.use("/api/", limiter);

  // Temel Sistem Rotaları
  app.use(metaRouter);

  // API v1 Rotaları
  app.use("/api/v1", tufeRouter);
  app.use("/api/v1", periodsRouter);
  app.use("/api/v1", calculateRouter);
  app.use("/api/v1", metaRouter);
  app.use("/api/v1", syncRouter);
  app.use("/api/v1", itemsRouter);

  // Kök Rota & Kullanım Kılavuzu Portalı
  // Kapsam rakamları canlı veri motorlarından okunur, sabit kodlanmaz.
  const sendGuide = (req, res) => {
    const latest = dataStore.getLatest();
    const itemsMeta = itemsStore.getMeta() || {};
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(
      renderGuideHtml({
        liveUrl: `http://${req.headers.host || "localhost:" + config.port}`,
        stats: {
          recordCount: dataStore.records.length,
          tufeEnd: latest ? `${latest.year}-${String(latest.month).padStart(2, "0")}` : null,
          totalItems: itemsMeta.totalItems ?? null,
          totalMonths: itemsMeta.totalMonths ?? null,
          itemsStart: itemsMeta.startPeriod ?? null,
          itemsEnd: itemsMeta.endPeriod ?? null,
        },
      })
    );
  };

  app.get("/", sendGuide);
  app.get("/guide", sendGuide);
  app.get("/kilavuz", sendGuide);

  // 404 Bulunamadı İşleyicisi
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `İstenen kaynak bulunamadı: ${req.method} ${req.originalUrl}`,
      hint: "Tüm rotalar ve kullanım için /docs adresini ziyaret edin.",
    });
  });

  // Merkezi Hata İşleyicisi
  app.use((err, req, res, next) => {
    console.error("[Sunucu Hatası]", err);
    res.status(500).json({
      success: false,
      error: "Sunucu içi bir hata oluştu.",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });

  return app;
}
