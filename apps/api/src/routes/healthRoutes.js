import { Router } from "express";
export function createHealthRoutes() {
  const router = Router();
  router.get("/", (_req, res) => res.json({ status: "ok" }));
  return router;
}
