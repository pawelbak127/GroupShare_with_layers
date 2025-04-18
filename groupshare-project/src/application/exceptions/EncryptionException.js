class EncryptionException extends ApplicationException {
    constructor(message, operation) {
      super(message, 'ENCRYPTION_ERROR');
      this.operation = operation;
    }
  }