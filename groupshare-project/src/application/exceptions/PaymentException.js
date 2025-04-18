class PaymentException extends ApplicationException {
    constructor(message, paymentId = null, details = {}) {
      super(message, 'PAYMENT_ERROR');
      this.paymentId = paymentId;
      this.details = details;
    }
  }
  