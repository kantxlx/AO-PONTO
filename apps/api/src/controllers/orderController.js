export function createOrderController(service) {
  return async (req, res) => {
    const result = await service.register(req.body);
    res.status(result.replayed ? 200 : 201).json(result);
  };
}
