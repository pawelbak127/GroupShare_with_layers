class TokenException extends ApplicationException {
    constructor(message, tokenId = null) {
      super(message, 'TOKEN_ERROR');
      this.tokenId = tokenId;
    }
  }