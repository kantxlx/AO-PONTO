export const money = (value) =>
  (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const number = (value) => String(value).padStart(3, "0");
export const days = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
export const normalize = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function priceFromInput(value) {
  const text = String(value).trim();
  if (!/^\d{1,6}(?:[.,]\d{1,2})?$/.test(text))
    throw new Error("Informe um preço válido com até duas casas decimais.");
  const cents = Math.round(Number(text.replace(",", ".")) * 100);
  if (cents > 10000000)
    throw new Error("O preço máximo permitido é R$ 100.000,00.");
  return cents;
}
export function waitingTime(createdAt) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt)) / 60000),
  );
  return minutes < 1
    ? "Agora"
    : minutes === 1
      ? "Há 1 minuto"
      : `Há ${minutes} minutos`;
}
