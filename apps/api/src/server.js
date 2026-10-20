import { config } from "./config.js";
import { createApp } from "./app.js";
import { createRuntime } from "./services/runtime.js";
import { fileURLToPath } from "node:url";
const runtime = await createRuntime(config);
const server = createApp(runtime.repository, {
  operations: runtime.service,
  webRoot:
    process.env.NODE_ENV === "production"
      ? fileURLToPath(new URL("../../web/dist/", import.meta.url))
      : undefined,
  demo: config.catalogSource === "demo",
}).listen(config.port, config.host, (error) => {
  if (error) return;
  console.log(
    `Ao Ponto API: http://${config.host}:${config.port} (${config.catalogSource})`,
  );
});
server.on("error", async (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `A porta ${config.port} está ocupada.`
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
      process.exit(0);
    });
    server.closeAllConnections();
  });
}
