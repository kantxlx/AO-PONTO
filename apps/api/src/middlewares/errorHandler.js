export function notFound(_req, res) {
  res.status(404).json({ message: "Recurso não encontrado." });
}
export function errorHandler(error, _req, res, _next) {
  console.error("Falha ao consultar catálogo:", error.message);
  res
    .status(503)
    .json({
      message: "Não foi possível carregar o cardápio. Tente novamente.",
    });
}
