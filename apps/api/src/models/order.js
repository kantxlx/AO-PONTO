import crypto from "node:crypto";
import OrderItem from "./orderItem.js";

class Order {
  constructor(inPerson = false) {
    this.id = crypto.randomUUID();
    this.orderNumber = null;
    this.orderItems = [];
    this.status = "REGISTERED";
    this.inPerson = inPerson;
    this.createdAt = new Date();
    this.completedAt = null;
  }

  addItem(cut, quantity, unitOfMeasure) {
    const item = new OrderItem(cut, quantity, unitOfMeasure);
    this.orderItems.push(item);
  }

  hasMinimumComposition() {
    return this.orderItems.length > 0;
  }
}

export default Order;