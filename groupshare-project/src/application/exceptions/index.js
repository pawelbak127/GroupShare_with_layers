// /src/application/exceptions/index.js

const ApplicationException = require('./ApplicationException');
const ValidationException = require('./ValidationException');
const AuthorizationException = require('./AuthorizationException');
const ResourceNotFoundException = require('./ResourceNotFoundException');
const BusinessRuleViolationException = require('./BusinessRuleViolationException');
const PaymentException = require('./PaymentException');
const AccessDeniedException = require('./AccessDeniedException');
const TokenException = require('./TokenException');
const EncryptionException = require('./EncryptionException');
const ServiceUnavailableException = require('./ServiceUnavailableException');

module.exports = {
  ApplicationException,
  ValidationException,
  AuthorizationException,
  ResourceNotFoundException,
  BusinessRuleViolationException,
  PaymentException,
  AccessDeniedException,
  TokenException,
  EncryptionException,
  ServiceUnavailableException
};