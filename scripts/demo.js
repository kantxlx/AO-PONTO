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
  const { createRuntime } = await import(
    pathToFileURL(
      path.join(projectRoot, "apps", "api", "src", "services", "runtime.js"),
    )
  );
  const runtime = await createRuntime({ catalogSource: "demo" });
  const repository = runtime.repository;
  const port = Number(process.env.DEMO_PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("DEMO_PORT deve ser uma porta entre 1 e 65535.");
  const server = createApp(repository, {
    demo: true,
    webRoot,
    operations: runtime.service,
  }).listen(port, "127.0.0.1", (error) => {
    if (error) return;
    console.log(`\nAo Ponto\nAbra no navegador: http://127.0.0.1:${port}\n`);
    console.log(
      "Demonstração em memória: dados são apagados ao encerrar. Gerente: gerente@demo.local / DemoAoPonto2026!",
    );
    console.log("Para encerrar, pressione Ctrl+C neste terminal.\n");
  });
  server.on("error", async (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? `A porta ${port} está ocupada. Feche outra execução ou configure DEMO_PORT.`
        : error.message,
    );
    await runtime.close();
    process.exitCode = 1;
  });
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      if (closing) return;
      closing = true;
      server.close(async () => {
        await runtime.close();
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
