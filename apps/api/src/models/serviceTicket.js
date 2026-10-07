import crypto from "node:crypto";
import TicketStatus from "./ticketStatus.js";

class ServiceTicket {
  static nextNumber = 1;

  constructor() {
    this.id = crypto.randomUUID();
    this.sequentialNumber = ServiceTicket.nextNumber;
    ServiceTicket.nextNumber += 1;

    this.status = TicketStatus.PENDING;
    this.callCount = 0;
    this.reissueCount = 0;
    this.lastCallAt = null;
    this.generatedAt = new Date();
  }

  static generate() {
    return new ServiceTicket();
  }
}

export default ServiceTicket;