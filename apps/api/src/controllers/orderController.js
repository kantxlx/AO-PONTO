import Order from "../models/order.js";
import ServiceTicket from "../models/serviceTicket.js";

export async function registerOrder(req, res) {
  try {
    const { items, inPerson = false } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "The order must contain at least one item.",
      });
    }

    const order = new Order(inPerson);

    for (const item of items) {
      order.addItem(item.cut, item.quantity, item.unitOfMeasure);
    }

    order.registerOrder;

    const serviceTicket = ServiceTicket.generate();

    return res.status(201).json({
      message: "Order registered successfully.",
      orderId: order.id,
      serviceTicket: serviceTicket.sequentialNumber,
      order,
    });
  } catch (error) {
    if (error.message === "The order must contain at least one item.") {
      return res.status(400).json({
        error: error.message,
      });
    }

    console.error("Error registering order:", error);

    return res.status(500).json({
      error: "Internal error while processing the order.",
    });
  }
}
