import { randomUUID } from "node:crypto";
import { config } from "../src/config.js";
import { createPostgresOperations } from "../src/repositories/operations.js";
import { hashPassword } from "../src/services/passwords.js";
import { text, ensure } from "../src/models/validation.js";
const store = createPostgresOperations(config.databaseUrl);
try {
  const name = text(process.env.ADMIN_NAME, "ADMIN_NAME", 100),
    email = text(process.env.ADMIN_EMAIL, "ADMIN_EMAIL", 200).toLowerCase();
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "ADMIN_EMAIL inválido.");
  const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD);
  await store.transaction(async (tx) => {
    ensure(
      !(await tx.listUsers()).some((u) => u.active && u.role === "MANAGER"),
      "Já existe um gerente ativo. Cadastre usuários pela administração.",
      409,
    );
    ensure(!(await tx.findUser(email)), "E-mail já cadastrado.", 409);
    await tx.saveUser({
      id: randomUUID(),
      name,
      email,
      passwordHash,
      role: "MANAGER",
      active: true,
    });
  });
  console.log("Gerente criado. Entre pela área Atendimento.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  delete process.env.ADMIN_PASSWORD;
  await store.close();
}
