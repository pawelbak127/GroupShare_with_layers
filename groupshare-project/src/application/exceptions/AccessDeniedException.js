class AccessDeniedException extends ApplicationException {
    constructor(message, resource, userId = null) {
      super(message, 'ACCESS_DENIED');
      this.resource = resource;
      this.userId = userId;
    }
  }