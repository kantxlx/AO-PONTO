import express from "express";
export function createApp(repository, { demo = false } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/cuts", async (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ cuts: await repository.list(), demo });
  });
  app.use((_req, res) =>
    res.status(404).json({ message: "Recurso não encontrado." }),
  );
  app.use((error, _req, res, _next) => {
    console.error("Falha ao consultar catálogo:", error.message);
    res
      .status(503)
      .json({
        message: "Não foi possível carregar o cardápio. Tente novamente.",
      });
  });
  return app;
}
