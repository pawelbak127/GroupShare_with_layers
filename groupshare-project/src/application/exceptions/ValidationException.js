class ValidationException extends ApplicationException {
    constructor(message, errors = {}) {
      super(message, 'VALIDATION_ERROR');
      this.errors = errors;
    }
  }