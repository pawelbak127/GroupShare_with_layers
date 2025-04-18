/**
 * Serwis autoryzacji sprawdzający uprawnienia użytkowników
 */
class AuthorizationService {
    constructor(userRepository, groupRepository) {
      this.userRepository = userRepository;
      this.groupRepository = groupRepository;
    }
  
    /**
     * Sprawdza czy użytkownik ma uprawnienia do danej grupy
     * @param {string} userId ID użytkownika
     * @param {string} groupId ID grupy
     * @param {string} permission Rodzaj uprawnienia (owner, admin, member)
     * @returns {Promise<boolean>} Czy użytkownik ma uprawnienia
     */
    async hasGroupPermission(userId, groupId, permission = 'member') {
      // Pobierz grupę
      const group = await this.groupRepository.findById(groupId);
      if (!group) return false;
      
      // Sprawdź czy użytkownik jest właścicielem
      if (permission === 'owner') {
        return group.ownerId === userId;
      }
      
      // Sprawdź czy użytkownik jest członkiem z odpowiednią rolą
      const members = await this.groupRepository.findMembers(groupId);
      const membership = members.find(m => m.userId === userId && m.isActive());
      
      if (!membership) return false;
      
      // Sprawdź uprawnienia
      if (permission === 'admin') {
        return membership.isAdmin();
      }
      
      // Dla 'member' wystarczy, że użytkownik jest członkiem
      return true;
    }
    
    /**
     * Sprawdza czy użytkownik ma uprawnienia do subskrypcji
     * @param {string} userId ID użytkownika
     * @param {string} subscriptionId ID subskrypcji
     * @param {string} permission Rodzaj uprawnienia (owner, admin, member, buyer)
     * @returns {Promise<boolean>} Czy użytkownik ma uprawnienia
     */
    async hasSubscriptionPermission(userId, subscriptionId, permission = 'buyer') {
      // Pobierz subskrypcję
      const subscription = await this.subscriptionRepository.findById(subscriptionId);
      if (!subscription) return false;
      
      // Dla kupującego sprawdź czy zakupił subskrypcję
      if (permission === 'buyer') {
        const purchases = await this.purchaseRepository.findBySubscriptionId(subscriptionId);
        return purchases.some(p => p.userId === userId && p.isCompleted());
      }
      
      // Dla pozostałych sprawdź uprawnienia do grupy
      return this.hasGroupPermission(userId, subscription.groupId, permission);
    }
    
    /**
     * Sprawdza czy użytkownik ma uprawnienia do zakupu
     * @param {string} userId ID użytkownika
     * @param {string} purchaseId ID zakupu
     * @returns {Promise<boolean>} Czy użytkownik ma uprawnienia
     */
    async hasPurchasePermission(userId, purchaseId) {
      const purchase = await this.purchaseRepository.findById(purchaseId);
      if (!purchase) return false;
      
      return purchase.userId === userId;
    }
  }
  
  module.exports = AuthorizationService;