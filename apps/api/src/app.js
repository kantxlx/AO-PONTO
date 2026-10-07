import express from "express";
import { registerOrder } from "./controllers/orderController.js";
export function createApp(repository, { demo = false, webRoot } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/cuts", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ cuts: await repository.list(), demo });
  });
  //UC03 Register Order
  app.post("/api/orders", registerOrder);

  if (webRoot) app.use(express.static(webRoot));
  app.use((_req, res) =>
    res.status(404).json({ message: "Recurso não encontrado." }),
  );
  app.use((error, _req, res, _next) => {
    console.error("Falha ao consultar catálogo:", error.message);
    res.status(503).json({
      message: "Não foi possível carregar o cardápio. Tente novamente.",
    });
  });
  return app;
}
