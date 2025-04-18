class AuthorizationException extends ApplicationException {
    constructor(message, requiredPermission = null) {
      super(message, 'AUTHORIZATION_ERROR');
      this.requiredPermission = requiredPermission;
    }
  }