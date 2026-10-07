import crypto from "node:crypto";
import OrderItem from "./orderItem.js";
import OrderStatus from "./orderStatus.js";

class Order {
  constructor(inPerson = false) {
    this.id = crypto.randomUUID();
    this.orderNumber = null;
    this.orderItems = [];
    this.status = OrderStatus.REGISTERED;
    this.inPerson = inPerson;
    this.createdAt = new Date();
    this.completedAt = null;
  }

  registerOrder() {
    if (!this.hasMinimumComposition()) {
      throw new Error("The order must contain at least one item.");
    }

    this.status = OrderStatus.REGISTERED;
    return this;
  }
  addItem(cut, quantity, unitOfMeasure) {
    const item = new OrderItem(cut, quantity, unitOfMeasure);
    this.orderItems.push(item);
    return item;
  }

  startPreparation() {
    if (this.status !== OrderStatus.REGISTERED) {
      throw new Error("Only registered orders can start preparation.");
    }

    this.status = OrderStatus.IN_PREPARATION;
  }

  completeOrder() {
    if (this.status !== OrderStatus.IN_PREPARATION) {
      throw new Error("Only orders in preparation can be completed.");
    }

    this.status = OrderStatus.COMPLETED;
    this.completedAt = new Date();
  }

  hasInPersonItems() {
    return this.inPerson && this.orderItems.length > 0;
  }

  blockCancellation() {
    return this.status !== OrderStatus.REGISTERED;
  }

  hasMinimumComposition() {
    return this.orderItems.length > 0;
  }
}

export default Order;
