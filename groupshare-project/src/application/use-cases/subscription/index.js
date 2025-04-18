// /src/application/use-cases/subscription/index.js

const { CreateSubscriptionUseCase, CreateSubscriptionRequestDTO, CreateSubscriptionResponseDTO } = require('./CreateSubscriptionUseCase');
const { PurchaseSubscriptionSlotUseCase, PurchaseSubscriptionSlotRequestDTO, PurchaseSubscriptionSlotResponseDTO } = require('./PurchaseSubscriptionSlotUseCase');
const { GetSubscriptionDetailsUseCase, GetSubscriptionDetailsRequestDTO, GetSubscriptionDetailsResponseDTO } = require('./GetSubscriptionDetailsUseCase');
const { ListAvailableSubscriptionsUseCase, ListAvailableSubscriptionsRequestDTO, ListAvailableSubscriptionsResponseDTO, SubscriptionDTO } = require('./ListAvailableSubscriptionsUseCase');
const { UpdateSubscriptionUseCase, UpdateSubscriptionRequestDTO, UpdateSubscriptionResponseDTO } = require('./UpdateSubscriptionUseCase');

module.exports = {
  // Przypadki użycia
  CreateSubscriptionUseCase,
  PurchaseSubscriptionSlotUseCase,
  GetSubscriptionDetailsUseCase,
  ListAvailableSubscriptionsUseCase,
  UpdateSubscriptionUseCase,
  
  // DTO Żądań
  CreateSubscriptionRequestDTO,
  PurchaseSubscriptionSlotRequestDTO,
  GetSubscriptionDetailsRequestDTO,
  ListAvailableSubscriptionsRequestDTO,
  UpdateSubscriptionRequestDTO,
  
  // DTO Odpowiedzi
  CreateSubscriptionResponseDTO,
  PurchaseSubscriptionSlotResponseDTO,
  GetSubscriptionDetailsResponseDTO,
  ListAvailableSubscriptionsResponseDTO,
  UpdateSubscriptionResponseDTO,
  SubscriptionDTO
};