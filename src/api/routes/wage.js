import { Router } from "express";
import { wageStore } from "../../engine/wageStore.js";
import { latestPayload, seriesPayload, realPayload } from "../../engine/wagePayload.js";

const router = Router();

/** Doğrulama hataları 400/404 döner; beklenmeyen hatalar merkezî işleyiciye gider. */
function send(res, next, build) {
  try {
    return res.json(build());
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    return next(err);
  }
}

/**
 * GET /api/v1/wage/latest
 * Yürürlükteki brüt asgari ücret ve bir önceki karara göre nominal/reel değişim
 */
router.get("/wage/latest", (req, res, next) => send(res, next, () => latestPayload(wageStore)));

/**
 * GET /api/v1/wage/real
 * Enflasyondan arındırılmış (reel) asgari ücret serisi
 * @query base YYYY-MM (varsayılan: en son TÜFE dönemi)
 */
router.get("/wage/real", (req, res, next) => send(res, next, () => realPayload(wageStore, req.query)));

/**
 * GET /api/v1/wage
 * Nominal asgari ücret serisi
 * @query granularity changes (varsayılan) | monthly
 */
router.get("/wage", (req, res, next) => send(res, next, () => seriesPayload(wageStore, req.query)));

export default router;
