// src/lib/database/supabase-client.js
import { createClient } from '@supabase/supabase-js';
import supabaseAdmin from './supabase-admin-client';

// Inicjalizacja klienta Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Sprawdzenie, czy zmienne środowiskowe są ustawione
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Brak wymaganych zmiennych środowiskowych: NEXT_PUBLIC_SUPABASE_URL lub NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Stała instancja klienta Supabase do ponownego użycia w całej aplikacji
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Standardowa obsługa błędów Supabase 
 * @param {Error} error - Błąd zwrócony przez Supabase
 * @param {string} operation - Nazwa operacji, która spowodowała błąd
 * @param {boolean} throwError - Czy wyrzucić błąd (true) czy zwrócić obiekt błędu (false)
 * @returns {Object} - Standardowy obiekt błędu (jeśli throwError = false)
 * @throws {Error} - Rzuca błąd (jeśli throwError = true)
 */
export const handleDatabaseError = (error, operation = 'database operation', throwError = false) => {
  // Tworzenie standardowego obiektu błędu
  const standardError = {
    error: true,
    message: error.message || `Wystąpił błąd podczas ${operation}`,
    code: error.code || 'unknown_error',
    details: error.details || null,
    operation,
    data: [] // Dodano pustą tablicę dla kompatybilności z klientem
  };

  // Zapisz szczegółowy log błędu
  console.error(`Database error during ${operation}:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    stack: error.stack
  });

  if (throwError) {
    // Stwórz nowy obiekt błędu z dodatkowymi metadanymi
    const enhancedError = new Error(standardError.message);
    enhancedError.code = standardError.code;
    enhancedError.details = standardError.details;
    enhancedError.operation = operation;
    enhancedError.data = []; // Dodano pustą tablicę dla kompatybilności
    throw enhancedError;
  }

  return standardError;
};

/**
 * Bezpieczne wykonanie operacji Supabase z obsługą błędów i fallbackiem do klienta administratora
 * @param {Function} operation - Funkcja operacji Supabase do wykonania
 * @param {string} operationName - Nazwa operacji (dla logów)
 * @param {boolean} useAdminOnFailure - Czy próbować z klientem admin w przypadku błędu uprawnień
 * @param {boolean} throwOnError - Czy wyrzucać błędy zamiast zwracać null/[] 
 * @returns {Promise<any>} - Wynik operacji lub null/[] w przypadku błędu
 */
export const safeQueryExecution = async (
  operation,
  operationName = 'database operation',
  useAdminOnFailure = true,
  throwOnError = false
) => {
  try {
    // Próba wykonania operacji ze standardowym klientem
    const result = await operation(supabase);
    
    // Jeśli wynik zawiera błąd
    if (result.error) {
      // Jeśli to błąd uprawnień i mamy fallback do admina
      if (result.error.code === '42501' && useAdminOnFailure) {
        console.log(`Permission denied during ${operationName}, trying admin client`);
        
        // Próba wykonania tej samej operacji z klientem administratora
        const adminResult = await operation(supabaseAdmin);
        
        if (adminResult.error) {
          return handleDatabaseError(adminResult.error, operationName, throwOnError);
        }
        
        // Upewnij się, że zwracamy dane w oczekiwanym formacie
        if (Array.isArray(adminResult.data)) {
          return adminResult.data;
        } else if (adminResult.data === null || adminResult.data === undefined) {
          return []; // Zwracamy pustą tablicę jeśli nie ma danych
        } else {
          return adminResult.data; // Zwracamy pojedynczy obiekt
        }
      }
      
      return handleDatabaseError(result.error, operationName, throwOnError);
    }
    
    // Upewnij się, że zwracamy dane w oczekiwanym formacie
    if (Array.isArray(result.data)) {
      return result.data;
    } else if (result.data === null || result.data === undefined) {
      return []; // Zwracamy pustą tablicę jeśli nie ma danych
    } else {
      return result.data; // Zwracamy pojedynczy obiekt
    }
  } catch (error) {
    return handleDatabaseError(error, operationName, throwOnError);
  }
};

// Repozytoria dostępu do danych - wysoki poziom abstrakcji

/**
 * Repozytorium użytkowników
 */
export const userRepository = {
  /**
   * Pobiera profil użytkownika na podstawie zewnętrznego ID uwierzytelniania
   * @param {string} authId - ID uwierzytelniania (np. z Clerk)
   * @returns {Promise<Object|null>} - Profil użytkownika lub null
   */
  async getByAuthId(authId) {
    if (!authId) return null;
    
    return safeQueryExecution(
      (client) => client
        .from('user_profiles')
        .select('*')
        .eq('external_auth_id', authId)
        .single(),
      'getByAuthId'
    );
  },
  
  /**
   * Tworzy nowy profil użytkownika
   * @param {Object} userProfile - Dane profilu użytkownika
   * @returns {Promise<Object|null>} - Utworzony profil użytkownika lub null
   */
  async create(userProfile) {
    return safeQueryExecution(
      (client) => client
        .from('user_profiles')
        .insert([userProfile])
        .select()
        .single(),
      'createUserProfile',
      true // zawsze używaj klienta admina przy tworzeniu użytkownika
    );
  },
  
  /**
   * Aktualizuje istniejący profil użytkownika
   * @param {string} userId - ID profilu użytkownika
   * @param {Object} updates - Dane do aktualizacji
   * @returns {Promise<Object|null>} - Zaktualizowany profil użytkownika lub null
   */
  async update(userId, updates) {
    return safeQueryExecution(
      (client) => client
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single(),
      'updateUserProfile'
    );
  },
  
  /**
   * Pobiera profil użytkownika po ID
   * @param {string} userId - ID profilu użytkownika
   * @returns {Promise<Object|null>} - Profil użytkownika lub null
   */
  async getById(userId) {
    return safeQueryExecution(
      (client) => client
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      'getUserById'
    );
  }
};

/**
 * Repozytorium ofert subskrypcji
 */
export const offersRepository = {
  /**
   * Pobiera oferty subskrypcji z filtrowaniem
   * @param {Object} filters - Filtry do zastosowania
   * @returns {Promise<Array>} - Lista ofert
   */
  async getAll(filters = {}) {
    // Przygotowanie bazowego zapytania
    const queryBuilder = (client) => {
      let query = client
        .from('group_subs')
        .select(`
          *,
          subscription_platforms(*),
          groups(id, name),
          owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level))
        `)
        .eq('status', 'active');
      
      // Zastosowanie filtrów
      if (filters.platformId) {
        query = query.eq('platform_id', filters.platformId);
      }
      
      if (filters.minPrice !== undefined) {
        query = query.gte('price_per_slot', filters.minPrice);
      }
      
      if (filters.maxPrice !== undefined) {
        query = query.lte('price_per_slot', filters.maxPrice);
      }
      
      if (filters.availableSlots === true) {
        query = query.gt('slots_available', 0);
      }
      
      // Sortowanie
      const orderBy = filters.orderBy || 'created_at';
      const ascending = filters.ascending === true;
      query = query.order(orderBy, { ascending });
      
      // Paginacja
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }
      
      return query;
    };
    
    return safeQueryExecution(queryBuilder, 'getAllOffers') || [];
  },
  
  /**
   * Pobiera ofertę subskrypcji po ID
   * @param {string} offerId - ID oferty
   * @returns {Promise<Object|null>} - Oferta subskrypcji lub null
   */
  async getById(offerId) {
    return safeQueryExecution(
      (client) => client
        .from('group_subs')
        .select(`
          *,
          subscription_platforms(*),
          groups(id, name, description),
          owner:groups!inner(owner_id, user_profiles!inner(id, display_name, avatar_url, rating_avg, rating_count, verification_level, bio))
        `)
        .eq('id', offerId)
        .single(),
      'getOfferById'
    );
  },
  
  /**
   * Tworzy nową ofertę subskrypcji
   * @param {Object} offerData - Dane oferty
   * @returns {Promise<Object|null>} - Utworzona oferta lub null
   */
  async create(offerData) {
    return safeQueryExecution(
      (client) => client
        .from('group_subs')
        .insert([offerData])
        .select()
        .single(),
      'createOffer'
    );
  },
  
  /**
   * Aktualizuje ofertę subskrypcji
   * @param {string} offerId - ID oferty
   * @param {Object} updates - Dane do aktualizacji
   * @returns {Promise<Object|null>} - Zaktualizowana oferta lub null 
   */
  async update(offerId, updates) {
    return safeQueryExecution(
      (client) => client
        .from('group_subs')
        .update(updates)
        .eq('id', offerId)
        .select()
        .single(),
      'updateOffer'
    );
  },
  
  /**
   * Usuwa ofertę subskrypcji
   * @param {string} offerId - ID oferty
   * @returns {Promise<boolean>} - Czy operacja się powiodła
   */
  async delete(offerId) {
    const result = await safeQueryExecution(
      (client) => client
        .from('group_subs')
        .delete()
        .eq('id', offerId),
      'deleteOffer'
    );
    
    return result !== null;
  }
};

/**
 * Repozytorium platform subskrypcji
 */
export const platformsRepository = {
  /**
   * Pobiera wszystkie aktywne platformy subskrypcji
   * @returns {Promise<Array>} - Lista platform
   */
  async getAll() {
    return safeQueryExecution(
      (client) => client
        .from('subscription_platforms')
        .select('*')
        .eq('active', true)
        .order('name'),
      'getAllPlatforms'
    ) || [];
  },
  
  /**
   * Pobiera platformę po ID
   * @param {string} platformId - ID platformy
   * @returns {Promise<Object|null>} - Platforma lub null
   */
  async getById(platformId) {
    return safeQueryExecution(
      (client) => client
        .from('subscription_platforms')
        .select('*')
        .eq('id', platformId)
        .single(),
      'getPlatformById'
    );
  }
};

/**
 * Repozytorium zakupów
 */
export const purchasesRepository = {
  /**
   * Tworzy nowy zakup
   * @param {Object} purchaseData - Dane zakupu
   * @returns {Promise<Object|null>} - Utworzony zakup lub null
   */
  async create(purchaseData) {
    return safeQueryExecution(
      (client) => client
        .from('purchase_records')
        .insert([purchaseData])
        .select()
        .single(),
      'createPurchase',
      true // używaj klienta admin
    );
  },
  
  /**
   * Pobiera zakup po ID
   * @param {string} purchaseId - ID zakupu
   * @returns {Promise<Object|null>} - Zakup lub null
   */
  async getById(purchaseId) {
    return safeQueryExecution(
      (client) => client
        .from('purchase_records')
        .select(`
          *,
          group_sub:group_subs(
            *,
            subscription_platforms(
              id,
              name,
              icon
            )
          )
        `)
        .eq('id', purchaseId)
        .single(),
      'getPurchaseById'
    );
  },
  
  /**
   * Aktualizuje zakup
   * @param {string} purchaseId - ID zakupu
   * @param {Object} updates - Dane do aktualizacji
   * @returns {Promise<Object|null>} - Zaktualizowany zakup lub null
   */
  async update(purchaseId, updates) {
    return safeQueryExecution(
      (client) => client
        .from('purchase_records')
        .update(updates)
        .eq('id', purchaseId)
        .select()
        .single(),
      'updatePurchase'
    );
  },
  
  /**
   * Pobiera zakupy użytkownika
   * @param {string} userId - ID użytkownika
   * @returns {Promise<Array>} - Lista zakupów
   */
  async getByUserId(userId) {
    return safeQueryExecution(
      (client) => client
        .from('purchase_records')
        .select(`
          *,
          group_sub:group_subs(
            *,
            subscription_platforms(
              id,
              name,
              icon
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      'getUserPurchases'
    ) || [];
  }
};

// Eksport podstawowego klienta Supabase
export default supabase;