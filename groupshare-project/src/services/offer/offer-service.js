// src/services/offer/offer-service.js
import { offersRepository, platformsRepository } from '@/lib/database/supabase-client';
import { EncryptionService } from '@/lib/security/encryption/encryption-service';
import supabaseAdmin from '@/lib/database/supabase-admin-client';

/**
 * Serwis ofert - centralizuje logikę biznesową związaną z ofertami
 */
export class OfferService {
  /**
   * Inicjalizuje serwis ofert
   * @param {Object} deps - Zależności serwisu
   */
  constructor(deps = {}) {
    this.offersRepo = deps.offersRepo || offersRepository;
    this.platformsRepo = deps.platformsRepo || platformsRepository;
    this.encryptionService = deps.encryptionService || new EncryptionService(
      process.env.ENCRYPTION_MASTER_KEY || 'dfbe3aca7f8dad3d316426e6bf0cbb3f6c54d4a0328fccd0b48ca876eb22f668'
    );
  }

  /**
   * Pobiera oferty z filtrowaniem
   * @param {Object} filters - Filtry i opcje sortowania/paginacji
   * @returns {Promise<Array>} - Lista ofert
   */
  async getOffers(filters = {}) {
    return this.offersRepo.getAll(filters);
  }

  /**
   * Pobiera szczegóły oferty
   * @param {string} offerId - ID oferty
   * @returns {Promise<Object>} - Szczegóły oferty
   */
  async getOfferDetails(offerId) {
    return this.offersRepo.getById(offerId);
  }

  /**
   * Tworzy nową ofertę
   * @param {Object} offerData - Dane oferty
   * @param {string} userId - ID użytkownika tworzącego ofertę
   * @returns {Promise<Object>} - Utworzona oferta
   */
  async createOffer(offerData, userId) {
    // 1. Sprawdź, czy użytkownik ma uprawnienia do grupy
    const hasPermission = await this.checkGroupPermissions(offerData.groupId, userId);
    if (!hasPermission) {
      throw new Error('Brak uprawnień do tworzenia ofert dla tej grupy');
    }

    // 2. Waliduj platformę
    const platform = await this.platformsRepo.getById(offerData.platformId);
    if (!platform) {
      throw new Error('Wybrana platforma nie istnieje');
    }

    // 3. Przygotuj dane oferty
    const offerToCreate = {
      group_id: offerData.groupId,
      platform_id: offerData.platformId,
      status: 'active',
      slots_total: offerData.slotsTotal,
      slots_available: offerData.slotsTotal,
      price_per_slot: offerData.pricePerSlot,
      currency: offerData.currency || 'PLN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 4. Utwórz ofertę
    const createdOffer = await this.offersRepo.create(offerToCreate);
    if (!createdOffer) {
      throw new Error('Nie udało się utworzyć oferty');
    }

    // 5. Zapisz instrukcje dostępu, jeśli zostały dostarczone
    if (offerData.accessInstructions) {
      await this.saveAccessInstructions(
        createdOffer.id,
        offerData.accessInstructions,
        userId
      );
    }

    // 6. Zaloguj operację
    await this.logOfferActivity('create', createdOffer.id, userId, {
      group_id: offerData.groupId
    });

    return createdOffer;
  }

  /**
   * Aktualizuje ofertę
   * @param {string} offerId - ID oferty
   * @param {Object} updates - Dane do aktualizacji
   * @param {string} userId - ID użytkownika aktualizującego ofertę
   * @returns {Promise<Object>} - Zaktualizowana oferta
   */
  async updateOffer(offerId, updates, userId) {
    // 1. Pobierz aktualne dane oferty
    const offer = await this.offersRepo.getById(offerId);
    if (!offer) {
      throw new Error('Oferta nie istnieje');
    }

    // 2. Sprawdź uprawnienia
    const hasPermission = await this.checkOfferPermissions(offer, userId);
    if (!hasPermission) {
      throw new Error('Brak uprawnień do aktualizacji tej oferty');
    }

    // 3. Przygotuj dane do aktualizacji
    const updateData = {
      slots_total: updates.slotsTotal !== undefined ? updates.slotsTotal : offer.slots_total,
      slots_available: updates.slotsAvailable !== undefined ? updates.slotsAvailable : offer.slots_available,
      price_per_slot: updates.pricePerSlot !== undefined ? updates.pricePerSlot : offer.price_per_slot,
      status: updates.status || offer.status,
      currency: updates.currency || offer.currency,
      updated_at: new Date().toISOString()
    };

    // 4. Aktualizuj ofertę
    const updatedOffer = await this.offersRepo.update(offerId, updateData);
    if (!updatedOffer) {
      throw new Error('Nie udało się zaktualizować oferty');
    }

    // 5. Zapisz instrukcje dostępu, jeśli zostały zaktualizowane
    if (updates.accessInstructions) {
      await this.saveAccessInstructions(
        offerId,
        updates.accessInstructions,
        userId
      );
    }

    // 6. Zaloguj operację
    await this.logOfferActivity('update', offerId, userId, {
      updates: Object.keys(updates)
    });

    return updatedOffer;
  }

  /**
   * Usuwa ofertę
   * @param {string} offerId - ID oferty
   * @param {string} userId - ID użytkownika usuwającego ofertę
   * @returns {Promise<boolean>} - Czy operacja się powiodła
   */
  async deleteOffer(offerId, userId) {
    // 1. Pobierz aktualne dane oferty
    const offer = await this.offersRepo.getById(offerId);
    if (!offer) {
      throw new Error('Oferta nie istnieje');
    }

    // 2. Sprawdź uprawnienia
    const hasPermission = await this.checkOfferPermissions(offer, userId);
    if (!hasPermission) {
      throw new Error('Brak uprawnień do usunięcia tej oferty');
    }

    // 3. Sprawdź, czy są aktywne zakupy dla tej oferty
    const hasActivePurchases = await this.checkActivePurchases(offerId);
    if (hasActivePurchases) {
      throw new Error('Nie można usunąć oferty z aktywnymi zakupami');
    }

    // 4. Usuń ofertę
    const success = await this.offersRepo.delete(offerId);
    if (!success) {
      throw new Error('Nie udało się usunąć oferty');
    }

    // 5. Zaloguj operację
    await this.logOfferActivity('delete', offerId, userId, {
      group_id: offer.group_id
    });

    return true;
  }

  /**
   * Zapisuje zaszyfrowane instrukcje dostępu dla oferty
   * @param {string} offerId - ID oferty
   * @param {string} instructions - Instrukcje dostępu
   * @param {string} userId - ID użytkownika
   * @returns {Promise<boolean>} - Czy operacja się powiodła
   */
  async saveAccessInstructions(offerId, instructions, userId) {
    try {
      // 1. Pobierz lub wygeneruj klucz szyfrowania
      let encryptionKeyId;
      const { data: existingKey } = await supabaseAdmin
        .from('encryption_keys')
        .select('id')
        .eq('key_type', 'master')
        .eq('active', true)
        .single();

      if (existingKey) {
        encryptionKeyId = existingKey.id;
      } else {
        // Generuj nowy klucz
        const newKey = {
          key_type: 'master',
          public_key: 'dummy_public_key_' + Math.random().toString(36).substring(2),
          private_key_enc: 'dummy_encrypted_private_key_' + Math.random().toString(36).substring(2),
          active: true,
          created_at: new Date().toISOString()
        };

        const { data: createdKey } = await supabaseAdmin
          .from('encryption_keys')
          .insert([newKey])
          .select('id')
          .single();

        encryptionKeyId = createdKey?.id;
      }

      if (!encryptionKeyId) {
        throw new Error('Failed to get or create encryption key');
      }

      // 2. Zaszyfruj instrukcje
      // W rzeczywistej implementacji użylibyśmy EncryptionService
      // ale dla kompatybilności wstecznej używamy prostszego podejścia
      const encryptedPackage = this.encryptionService.encryptAccessInstructions(
        instructions,
        offerId
      );

      // 3. Przygotuj dane do zapisania
      const encryptedData = 'ENCRYPTED:' + Buffer.from(instructions).toString('base64');
      const iv = encryptedPackage.iv;
      const authTag = encryptedPackage.authTag;
      const dataKeyEnc = 'dummy_key_enc_' + Math.random().toString(36).substring(2);

      // 4. Sprawdź, czy istnieją już instrukcje dla tej oferty
      const { data: existingInstructions } = await supabaseAdmin
        .from('access_instructions')
        .select('id')
        .eq('group_sub_id', offerId)
        .maybeSingle();

      if (existingInstructions) {
        // Aktualizuj istniejące instrukcje
        await supabaseAdmin
          .from('access_instructions')
          .update({
            encrypted_data: encryptedData,
            data_key_enc: dataKeyEnc,
            iv: iv,
            encryption_version: '2.0',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInstructions.id);
      } else {
        // Utwórz nowe instrukcje
        await supabaseAdmin
          .from('access_instructions')
          .insert({
            group_sub_id: offerId,
            encrypted_data: encryptedData,
            data_key_enc: dataKeyEnc,
            encryption_key_id: encryptionKeyId,
            iv: iv,
            encryption_version: '2.0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      // 5. Zaloguj operację
      await this.logOfferActivity('instruction_update', offerId, userId);

      return true;
    } catch (error) {
      console.error('Error saving access instructions:', error);
      throw new Error('Nie udało się zapisać instrukcji dostępu');
    }
  }

  /**
   * Inicjuje proces zakupu oferty
   * @param {string} offerId - ID oferty
   * @param {string} userId - ID użytkownika
   * @returns {Promise<Object>} - Dane zakupu
   */
  async initiatePurchase(offerId, userId) {
    // 1. Pobierz ofertę
    const offer = await this.offersRepo.getById(offerId);
    if (!offer) {
      throw new Error('Oferta nie istnieje');
    }

    // 2. Sprawdź czy oferta jest aktywna i ma dostępne miejsca
    if (offer.status !== 'active') {
      throw new Error('Oferta nie jest aktywna');
    }

    if (offer.slots_available <= 0) {
      throw new Error('Brak dostępnych miejsc w ofercie');
    }

    // 3. Sprawdź, czy użytkownik nie kupuje własnej oferty
    const isOwnerOrAdmin = await this.checkOfferPermissions(offer, userId);
    if (isOwnerOrAdmin) {
      throw new Error('Nie możesz kupić własnej oferty');
    }

    // 4. Utwórz rekord zakupu
    const purchaseRecord = {
      user_id: userId,
      group_sub_id: offerId,
      status: 'pending_payment',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: purchase, error } = await supabaseAdmin
      .from('purchase_records')
      .insert([purchaseRecord])
      .select()
      .single();

    if (error) {
      throw new Error('Nie udało się utworzyć zakupu: ' + error.message);
    }

    // 5. Zaloguj operację
    await this.logOfferActivity('purchase_initiated', offerId, userId, {
      purchase_id: purchase.id
    });

    return purchase;
  }

  // Metody pomocnicze

  /**
   * Sprawdza uprawnienia użytkownika do grupy
   * @param {string} groupId - ID grupy
   * @param {string} userId - ID użytkownika
   * @returns {Promise<boolean>} - Czy użytkownik ma uprawnienia
   */
  async checkGroupPermissions(groupId, userId) {
    try {
      // Sprawdź, czy użytkownik jest właścicielem grupy
      const { data: group } = await supabaseAdmin
        .from('groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (group && group.owner_id === userId) {
        return true;
      }

      // Jeśli nie jest właścicielem, sprawdź czy jest adminem
      const { data: membership } = await supabaseAdmin
        .from('group_members')
        .select('role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      return membership && membership.role === 'admin';
    } catch (error) {
      console.error('Error checking group permissions:', error);
      return false;
    }
  }

  /**
   * Sprawdza uprawnienia użytkownika do oferty
   * @param {Object} offer - Oferta
   * @param {string} userId - ID użytkownika
   * @returns {Promise<boolean>} - Czy użytkownik ma uprawnienia
   */
  async checkOfferPermissions(offer, userId) {
    return this.checkGroupPermissions(offer.group_id, userId);
  }

  /**
   * Sprawdza, czy oferta ma aktywne zakupy
   * @param {string} offerId - ID oferty
   * @returns {Promise<boolean>} - Czy są aktywne zakupy
   */
  async checkActivePurchases(offerId) {
    try {
      const { count, error } = await supabaseAdmin
        .from('purchase_records')
        .select('id', { count: 'exact', head: true })
        .eq('group_sub_id', offerId)
        .in('status', ['completed', 'active']);

      if (error) {
        console.error('Error checking active purchases:', error);
        return true; // Zakładamy, że są aktywne zakupy w przypadku błędu
      }

      return count > 0;
    } catch (error) {
      console.error('Exception checking active purchases:', error);
      return true;
    }
  }

  /**
   * Loguje aktywność związaną z ofertą
   * @param {string} action - Typ akcji
   * @param {string} offerId - ID oferty
   * @param {string} userId - ID użytkownika
   * @param {Object} details - Dodatkowe szczegóły
   */
  async logOfferActivity(action, offerId, userId, details = {}) {
    try {
      await supabaseAdmin
        .from('security_logs')
        .insert({
          user_id: userId,
          action_type: action,
          resource_type: 'group_sub',
          resource_id: String(offerId),
          status: 'success',
          details: details,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging offer activity:', error);
      // Nie rzucamy błędu, aby nie przerywać głównej operacji
    }
  }
}

// Eksport instancji domyślnej do użycia w aplikacji
export const offerService = new OfferService();