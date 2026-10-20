export const cutImages = Object.fromEntries(
  [
    "picanha",
    "alcatra",
    "patinho",
    "costela",
    "lombo",
    "linguica",
    "peito-frango",
    "frango-inteiro",
  ].map((id) => [id, `/images/${id}.webp`]),
);
export const allImages = ["/images/hero.webp", ...Object.values(cutImages)];
