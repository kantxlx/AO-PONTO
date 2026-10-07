class ServiceTicket {
  static nextNumber = 1;

  static generate() {
    const number = ServiceTicket.nextNumber;
    ServiceTicket.nextNumber += 1;

    return number;
  }
}

export default ServiceTicket;