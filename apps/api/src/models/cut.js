// Modelo do catálogo público. Não expõe colunas internas de persistência.
export function toCut(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    priceCents: row.priceCents,
    units: [...row.units],
    available: row.available,
  };
}
