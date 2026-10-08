import { toCut } from "../models/cut.js";
export function createCatalogService(repository) {
  return {
    async listCuts() {
      return (await repository.list()).map(toCut);
    },
  };
}
