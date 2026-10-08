import { Router } from "express";
export function createCatalogRoutes(controller) {
  const router = Router();
  router.get("/", controller.list);
  return router;
}
