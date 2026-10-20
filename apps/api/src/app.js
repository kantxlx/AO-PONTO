import express from "express";
import { createCatalogService } from "./services/catalogService.js";
import { createCatalogController } from "./controllers/catalogController.js";
import { createCatalogRoutes } from "./routes/catalogRoutes.js";
import { createHealthRoutes } from "./routes/healthRoutes.js";
import { createOperationsRoutes } from "./routes/operationsRoutes.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
export function createApp(
  repository,
  { demo = false, webRoot, operations } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use((_req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "same-origin");
    next();
  });
  const service = createCatalogService(repository);
  const controller = createCatalogController(service, { demo });
  app.use("/api/health", createHealthRoutes());
  app.use("/api/cuts", createCatalogRoutes(controller));
  if (operations) app.use("/api", createOperationsRoutes(operations, { demo }));
  if (webRoot) app.use(express.static(webRoot));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
