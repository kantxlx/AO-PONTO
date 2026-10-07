const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { access } = require("node:fs/promises");

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const webRoot = path.join(projectRoot, "apps", "web", "dist");
  await access(path.join(webRoot, "index.html"));
  const { createApp } = await import(
    pathToFileURL(path.join(projectRoot, "apps", "api", "src", "app.js"))
  );
  const { createCutRepository } = await import(
    pathToFileURL(
      path.join(projectRoot, "apps", "api", "src", "repositories", "cuts.js"),
    )
  );
  const repository = createCutRepository({ catalogSource: "demo" });
  const port = Number(process.env.DEMO_PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("DEMO_PORT deve ser uma porta entre 1 e 65535.");
  const server = createApp(repository, { demo: true, webRoot }).listen(
    port,
    "127.0.0.1",
    () => {
      console.log(`\nAo Ponto\nAbra no navegador: http://127.0.0.1:${port}\n`);
      console.log(
        "Catálogo de demonstração. Não requer PostgreSQL ou internet durante o uso.",
      );
      console.log("Para encerrar, pressione Ctrl+C neste terminal.\n");
    },
  );
  server.on("error", async (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? `A porta ${port} está ocupada. Feche outra execução ou configure DEMO_PORT.`
        : error.message,
    );
    await repository.close();
    process.exitCode = 1;
  });
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      if (closing) return;
      closing = true;
      server.close(async () => {
        await repository.close();
      });
      server.closeAllConnections();
    });
  }
}
main().catch((error) => {
  console.error(`Não foi possível iniciar: ${error.message}`);
  console.error("Na pasta do projeto, execute npm ci e depois npm run demo.");
  process.exitCode = 1;
});
