import { randomUUID } from "node:crypto";
export function createOrder({ idempotencyKey, requestHash, inPerson, items }) {
  return {
    id: randomUUID(),
    idempotencyKey,
    requestHash,
    inPerson,
    items,
    status: "REGISTERED",
    assignedTo: null,
    completedAt: null,
  };
}
