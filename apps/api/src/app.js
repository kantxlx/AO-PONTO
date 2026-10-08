import express from "express";
import { createCatalogService } from "./services/catalogService.js";
import { createCatalogController } from "./controllers/catalogController.js";
import { createCatalogRoutes } from "./routes/catalogRoutes.js";
import { createHealthRoutes } from "./routes/healthRoutes.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
export function createApp(repository, { demo = false, webRoot } = {}) {
  const app = express();
  app.disable("x-powered-by");
  const service = createCatalogService(repository);
  const controller = createCatalogController(service, { demo });
  app.use("/api/health", createHealthRoutes());
  app.use("/api/cuts", createCatalogRoutes(controller));
  if (webRoot) app.use(express.static(webRoot));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
