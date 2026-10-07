export function parseQuantity(value, unit) {
  const text = String(value).trim();
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(text))
    throw new Error("Informe uma quantidade válida com até 3 casas decimais.");
  const quantity = Number(text.replace(",", "."));
  if (quantity <= 0 || quantity > 100)
    throw new Error("A quantidade deve ser maior que zero e no máximo 100.");
  if (unit === "un" && !Number.isInteger(quantity))
    throw new Error("Para unidades, informe um número inteiro.");
  return quantity;
}
export function addItem(cart, cut, value, unit) {
  if (!cut.available) throw new Error("Este corte está indisponível.");
  if (!cut.units.includes(unit))
    throw new Error("Unidade não permitida para este corte.");
  const quantity = parseQuantity(value, unit);
  const previous = cart.find(
    (item) => item.cutId === cut.id && item.unit === unit,
  );
  const total =
    Math.round(((previous?.quantity || 0) + quantity) * 1000) / 1000;
  parseQuantity(total, unit);
  return [
    ...cart.filter((item) => item !== previous),
    { cutId: cut.id, unit, quantity: total },
  ];
}
// Armazena somente a seleção. Preços e disponibilidade sempre vêm do catálogo.
export function restoreCart(raw) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const seen = new Set();
    return data
      .filter((item) => {
        if (
          !item ||
          typeof item.cutId !== "string" ||
          !["kg", "un"].includes(item.unit) ||
          typeof item.quantity !== "number"
        )
          return false;
        try {
          parseQuantity(item.quantity, item.unit);
        } catch {
          return false;
        }
        const key = `${item.cutId}:${item.unit}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(({ cutId, unit, quantity }) => ({ cutId, unit, quantity }));
  } catch {
    return [];
  }
}
export function reconcileCart(cart, cuts) {
  return cart.filter((item) =>
    cuts.some(
      (cut) =>
        cut.id === item.cutId && cut.available && cut.units.includes(item.unit),
    ),
  );
}
