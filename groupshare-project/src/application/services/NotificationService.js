/**
 * Serwis zarządzający powiadomieniami dla użytkowników
 */
class NotificationService {
    constructor(notificationRepository, userRepository) {
      this.notificationRepository = notificationRepository;
      this.userRepository = userRepository;
    }
  
    /**
     * Wysyła powiadomienie do użytkownika
     * @param {string} userId ID użytkownika
     * @param {string} type Typ powiadomienia
     * @param {string} title Tytuł powiadomienia
     * @param {string} content Treść powiadomienia
     * @param {string} relatedEntityType Typ powiązanej encji
     * @param {string} relatedEntityId ID powiązanej encji
     * @returns {Promise<void>}
     */
    async sendNotification(userId, type, title, content, relatedEntityType, relatedEntityId) {
      // Sprawdź czy użytkownik istnieje
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundException('User not found', 'user', userId);
      }
      
      // Utwórz powiadomienie
      const notification = {
        userId,
        type,
        title,
        content,
        relatedEntityType,
        relatedEntityId,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      // Zapisz powiadomienie
      await this.notificationRepository.create(notification);
    }
    
    /**
     * Wysyła powiadomienie o zakupie do sprzedającego i kupującego
     * @param {Purchase} purchase Zakup
     * @param {Subscription} subscription Subskrypcja
     * @returns {Promise<void>}
     */
    async sendPurchaseNotifications(purchase, subscription) {
      // Powiadomienie dla kupującego
      await this.sendNotification(
        purchase.userId,
        'purchase_completed',
        'Zakup zakończony pomyślnie',
        `Twój zakup subskrypcji ${subscription.platformName} został pomyślnie zakończony.`,
        'purchase',
        purchase.id
      );
      
      // Powiadomienie dla sprzedającego (właściciela grupy)
      const group = await this.groupRepository.findById(subscription.groupId);
      await this.sendNotification(
        group.ownerId,
        'sale_completed',
        'Sprzedaż zakończona pomyślnie',
        `Ktoś właśnie kupił miejsce w Twojej subskrypcji ${subscription.platformName}.`,
        'purchase',
        purchase.id
      );
    }
    
    /**
     * Wysyła powiadomienie o problemie z dostępem
     * @param {string} userId ID użytkownika zgłaszającego
     * @param {string} sellerId ID sprzedającego
     * @param {string} disputeId ID sporu
     * @param {string} subscriptionName Nazwa subskrypcji
     * @returns {Promise<void>}
     */
    async sendAccessProblemNotification(userId, sellerId, disputeId, subscriptionName) {
      // Powiadomienie dla kupującego
      await this.sendNotification(
        userId,
        'dispute_created',
        'Zgłoszenie problemu z dostępem',
        'Twoje zgłoszenie zostało zarejestrowane. Skontaktujemy się z Tobą wkrótce.',
        'dispute',
        disputeId
      );
      
      // Powiadomienie dla sprzedającego
      await this.sendNotification(
        sellerId,
        'dispute_filed',
        'Zgłoszono problem z dostępem',
        `Kupujący zgłosił problem z dostępem do Twojej subskrypcji ${subscriptionName}.`,
        'dispute',
        disputeId
      );
    }
  }
  
  module.exports = NotificationService;