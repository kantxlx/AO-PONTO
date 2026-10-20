export function notFound(_req, res) {
  res.status(404).json({ message: "Recurso não encontrado." });
}
export function errorHandler(error, _req, res, _next) {
  if (error.status && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({
      message:
        error.type === "entity.parse.failed" ? "JSON inválido." : error.message,
    });
  }
  console.error("Falha na operação:", error.message);
  res.status(503).json({
    message: "Serviço temporariamente indisponível. Tente novamente.",
  });
}
