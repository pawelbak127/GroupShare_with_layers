class BusinessRuleViolationException extends ApplicationException {
    constructor(message, rule) {
      super(message, 'BUSINESS_RULE_VIOLATION');
      this.rule = rule;
    }
  }