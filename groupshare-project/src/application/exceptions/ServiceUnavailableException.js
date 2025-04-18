class ServiceUnavailableException extends ApplicationException {
    constructor(message, serviceName, retryAfter = null) {
      super(message, 'SERVICE_UNAVAILABLE');
      this.serviceName = serviceName;
      this.retryAfter = retryAfter;
    }
  }