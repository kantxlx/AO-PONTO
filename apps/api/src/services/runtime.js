import {
  createMemoryOperations,
  createPostgresOperations,
} from "../repositories/operations.js";
import { createOperationsService } from "./operationsService.js";
export async function createRuntime(config) {
  const demo = config.catalogSource === "demo";
  const store = demo
    ? await createMemoryOperations()
    : createPostgresOperations(config.databaseUrl);
  const service = createOperationsService(store);
  const repository = {
    list: () =>
      store.transaction(async (tx) =>
        (await tx.listCuts()).filter((c) => c.active),
      ),
    close: () => store.close(),
  };
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await service.tick();
    } catch (error) {
      console.error("Falha na chamada automática:", error.message);
    } finally {
      busy = false;
    }
  }, 1000);
  timer.unref();
  return {
    repository,
    service,
    async close() {
      clearInterval(timer);
      await store.close();
    },
  };
}
