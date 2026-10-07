import { config } from "./config.js";
import { createApp } from "./app.js";
import { createCutRepository } from "./repositories/cuts.js";
const repository = createCutRepository(config);
const server = createApp(repository, {
  demo: config.catalogSource === "demo",
}).listen(config.port, config.host, () => {
  console.log(
    `Ao Ponto API: http://${config.host}:${config.port} (${config.catalogSource})`,
  );
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () =>
    server.close(async () => {
      await repository.close();
      process.exit(0);
    }),
  );
}
