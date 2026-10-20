export class DomainError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function ensure(condition, message, status = 400) {
  if (!condition) throw new DomainError(message, status);
}
export function text(value, label, max = 200) {
  ensure(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= max,
    `${label} inválido.`,
  );
  return value.trim();
}
export function integer(value, min, max, label) {
  ensure(
    Number.isInteger(value) && value >= min && value <= max,
    `${label} inválido.`,
  );
  return value;
}
export function quantity(value, unit) {
  ensure(
    /^[0-9]+(?:[.,][0-9]{1,3})?$/.test(String(value)),
    "Quantidade inválida. Use até 3 casas decimais.",
  );
  const n = Number(String(value).replace(",", "."));
  ensure(
    n > 0 && n <= 100 && (unit !== "un" || Number.isInteger(n)),
    "Quantidade deve ser de 1 a 100 unidades ou maior que zero e até 100 kg.",
  );
  return n;
}
