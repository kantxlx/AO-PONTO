export function createCatalogController(service, { demo = false } = {}) {
  return {
    async list(req, res, next) {
      try {
        const cuts = await service.listCuts();
        res.set("Cache-Control", "no-store");
        res.json({ cuts, demo });
      } catch (error) {
        next(error);
      }
    },
  };
}
