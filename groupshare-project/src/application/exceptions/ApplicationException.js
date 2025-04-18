class ApplicationException extends Error {
    constructor(message, code = 'APPLICATION_ERROR') {
      super(message);
      this.name = this.constructor.name;
      this.code = code;
    }
  }