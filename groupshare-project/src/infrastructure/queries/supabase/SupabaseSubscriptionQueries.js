// src/infrastructure/queries/supabase/SupabaseSubscriptionQueries.js

const SubscriptionQueries = require('../../../application/ports/queries/SubscriptionQueries');

/**
 * Implementacja interfejsu zapytań subskrypcji dla Supabase
 * @implements {SubscriptionQueries}
 */
class SupabaseSubscriptionQueries extends SubscriptionQueries {
  /**
   * @param {Object} supabaseClient - Klient Supabase
   */
  constructor(supabaseClient) {
    super();
    this.supabaseClient = supabaseClient;
  }
  
  /**
   * Wyszukuje subskrypcje według kryteriów z paginacją
   * @param {Object} criteria - Kryteria wyszukiwania
   * @param {Object} pagination - Opcje paginacji
   * @returns {Promise<Object>} Wyniki z paginacją
   */
  async findByCriteria(criteria, pagination) {
    const {
      platformId,
      minPrice,
      maxPrice,
      availableOnly = false,
      status = 'active',
      groupId
    } = criteria || {};
    
    const {
      page = 1,
      limit = 20,
      orderBy = 'created_at',
      ascending = false
    } = pagination || {};
    
    // Przygotuj zapytanie bazowe z rozszerzoną selekcją powiązanych danych
    let query = this.supabaseClient
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups(
          id, 
          name, 
          description, 
          owner_id, 
          user_profiles(
            id, 
            display_name, 
            avatar_url, 
            rating_avg, 
            verification_level
          )
        )
      `);
    
    // Dodaj filtry
    if (platformId) {
      query = query.eq('platform_id', platformId);
    }
    
    if (groupId) {
      query = query.eq('group_id', groupId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (availableOnly) {
      query = query.gt('slots_available', 0);
    }
    
    if (minPrice !== undefined && minPrice !== null) {
      query = query.gte('price_per_slot', minPrice);
    }
    
    if (maxPrice !== undefined && maxPrice !== null) {
      query = query.lte('price_per_slot', maxPrice);
    }
    
    // Utwórz kopię zapytania do zliczania (bez selekcji powiązanych danych)
    let countQuery = this.supabaseClient.from('group_subs').select('id', { count: 'exact', head: true });
    
    // Dodaj te same filtry do zapytania liczącego
    if (platformId) {
      countQuery = countQuery.eq('platform_id', platformId);
    }
    
    if (groupId) {
      countQuery = countQuery.eq('group_id', groupId);
    }
    
    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    
    if (availableOnly) {
      countQuery = countQuery.gt('slots_available', 0);
    }
    
    if (minPrice !== undefined && minPrice !== null) {
      countQuery = countQuery.gte('price_per_slot', minPrice);
    }
    
    if (maxPrice !== undefined && maxPrice !== null) {
      countQuery = countQuery.lte('price_per_slot', maxPrice);
    }
    
    // Pobierz całkowitą liczbę wyników
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('Error counting subscriptions:', countError);
      throw new Error(`Failed to count subscriptions: ${countError.message}`);
    }
    
    // Dodaj sortowanie
    query = query.order(orderBy, { ascending });
    
    // Dodaj paginację
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    // Wykonaj zapytanie
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }
    
    // Transformuj dane do formatu wynikowego
    const items = data.map(item => ({
      id: item.id,
      groupId: item.group_id,
      groupName: item.groups?.name,
      platformId: item.platform_id,
      platformName: item.subscription_platforms?.name,
      platformIcon: item.subscription_platforms?.icon,
      status: item.status,
      slotsTotal: item.slots_total,
      slotsAvailable: item.slots_available,
      pricePerSlot: item.price_per_slot,
      currency: item.currency,
      owner: item.groups?.user_profiles ? {
        id: item.groups.user_profiles.id,
        displayName: item.groups.user_profiles.display_name,
        avatarUrl: item.groups.user_profiles.avatar_url,
        rating: item.groups.user_profiles.rating_avg,
        verificationLevel: item.groups.user_profiles.verification_level
      } : null,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
    
    return {
      items,
      totalCount: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }
  
  /**
   * Pobiera subskrypcję ze wszystkimi potrzebnymi danymi dla szczegółowego widoku
   * @param {string} id - ID subskrypcji
   * @returns {Promise<Object>} Subskrypcja z powiązanymi danymi
   */
  async getSubscriptionDetails(id) {
    const { data, error } = await this.supabaseClient
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(*),
        groups(
          id, 
          name, 
          description, 
          owner_id, 
          user_profiles(
            id, 
            display_name, 
            avatar_url, 
            rating_avg, 
            verification_level,
            bio,
            email
          )
        ),
        access_instructions(id)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching subscription details:', error);
      throw new Error(`Failed to fetch subscription details: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Subscription with ID ${id} not found`);
    }
    
    // Sprawdź, czy istnieją instrukcje dostępu
    const hasAccessInstructions = data.access_instructions && data.access_instructions.id;
    
    return {
      id: data.id,
      groupId: data.group_id,
      groupName: data.groups?.name,
      platformId: data.platform_id,
      platformName: data.subscription_platforms?.name,
      platformIcon: data.subscription_platforms?.icon,
      status: data.status,
      slotsTotal: data.slots_total,
      slotsAvailable: data.slots_available,
      pricePerSlot: data.price_per_slot,
      currency: data.currency,
      owner: data.groups?.user_profiles ? {
        id: data.groups.user_profiles.id,
        displayName: data.groups.user_profiles.display_name,
        avatarUrl: data.groups.user_profiles.avatar_url,
        email: data.groups.user_profiles.email,
        bio: data.groups.user_profiles.bio,
        rating: data.groups.user_profiles.rating_avg,
        verificationLevel: data.groups.user_profiles.verification_level
      } : null,
      hasAccessInstructions,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
  
  /**
   * Pobiera subskrypcje dla grupy z podstawowymi informacjami
   * @param {string} groupId - ID grupy
   * @returns {Promise<Array<Object>>} Lista subskrypcji
   */
  async getSubscriptionsForGroup(groupId) {
    const { data, error } = await this.supabaseClient
      .from('group_subs')
      .select(`
        *,
        subscription_platforms(id, name, icon)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching group subscriptions:', error);
      throw new Error(`Failed to fetch group subscriptions: ${error.message}`);
    }
    
    return data.map(item => ({
      id: item.id,
      platformId: item.platform_id,
      platformName: item.subscription_platforms?.name,
      platformIcon: item.subscription_platforms?.icon,
      status: item.status,
      slotsTotal: item.slots_total,
      slotsAvailable: item.slots_available,
      pricePerSlot: item.price_per_slot,
      currency: item.currency,
      createdAt: item.created_at
    }));
  }
  
  /**
   * Sprawdza, czy istnieją subskrypcje dla grupy
   * @param {string} groupId - ID grupy
   * @returns {Promise<boolean>} Czy grupa ma subskrypcje
   */
  async hasSubscriptions(groupId) {
    const { count, error } = await this.supabaseClient
      .from('group_subs')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId);
    
    if (error) {
      console.error('Error checking group subscriptions:', error);
      throw new Error(`Failed to check group subscriptions: ${error.message}`);
    }
    
    return count > 0;
  }
  
  /**
   * Pobiera statystyki subskrypcji dla grupy
   * @param {string} groupId - ID grupy
   * @returns {Promise<Object>} Statystyki subskrypcji
   */
  async getSubscriptionStats(groupId) {
    // Pobierz wszystkie subskrypcje dla grupy
    const { data, error } = await this.supabaseClient
      .from('group_subs')
      .select('*')
      .eq('group_id', groupId);
    
    if (error) {
      console.error('Error fetching group subscription stats:', error);
      throw new Error(`Failed to fetch group subscription stats: ${error.message}`);
    }
    
    // Pobierz zakupy dla tych subskrypcji
    let purchases = [];
    
    if (data.length > 0) {
      const subscriptionIds = data.map(sub => sub.id);
      
      const { data: purchasesData, error: purchasesError } = await this.supabaseClient
        .from('purchase_records')
        .select('*')
        .in('group_sub_id', subscriptionIds)
        .eq('status', 'completed');
      
      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError);
      } else {
        purchases = purchasesData;
      }
    }
    
    // Oblicz statystyki
    const totalSubscriptions = data.length;
    const activeSubscriptions = data.filter(sub => sub.status === 'active').length;
    const totalSlots = data.reduce((sum, sub) => sum + sub.slots_total, 0);
    const availableSlots = data.reduce((sum, sub) => sum + sub.slots_available, 0);
    const totalSales = purchases.length;
    const totalRevenue = purchases.reduce((sum, purchase) => {
      const subscription = data.find(sub => sub.id === purchase.group_sub_id);
      return sum + (subscription ? subscription.price_per_slot : 0);
    }, 0);
    
    return {
      totalSubscriptions,
      activeSubscriptions,
      totalSlots,
      availableSlots,
      occupiedSlots: totalSlots - availableSlots,
      occupancyRate: totalSlots > 0 ? ((totalSlots - availableSlots) / totalSlots) * 100 : 0,
      totalSales,
      totalRevenue
    };
  }
  
  /**
   * Pobiera popularne platformy z liczbą subskrypcji
   * @param {number} [limit=5] - Limit wyników
   * @returns {Promise<Array<Object>>} Lista platform z liczbą subskrypcji
   */
  async getPopularPlatforms(limit = 5) {
    const { data, error } = await this.supabaseClient
      .from('subscription_platforms')
      .select(`
        id,
        name,
        icon,
        active,
        group_subs(count)
      `)
      .eq('active', true)
      .order('group_subs.count', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching popular platforms:', error);
      throw new Error(`Failed to fetch popular platforms: ${error.message}`);
    }
    
    return data.map(platform => ({
      id: platform.id,
      name: platform.name,
      icon: platform.icon,
      active: platform.active,
      subscriptionCount: platform.group_subs[0].count
    }));
  }
}

module.exports = SupabaseSubscriptionQueries;