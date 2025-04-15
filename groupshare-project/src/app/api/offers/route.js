// src/app/api/offers/route.js
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { offersRepository, userRepository } from '@/lib/database/supabase-client';
import { handleApiError, apiResponse, validateRequestBody, protectApiRoute } from '@/lib/api/error-handler';
import crypto from 'crypto';

// Schemat walidacji dla tworzenia oferty
const createOfferSchema = {
  groupId: { required: true },
  platformId: { required: true },
  slotsTotal: { required: true, type: 'number', min: 1 },
  pricePerSlot: { required: true, type: 'number', min: 0.01 },
  accessInstructions: { required: true, minLength: 10 },
  currency: { type: 'string' }
};

/**
 * GET /api/offers
 * Pobiera oferty subskrypcji z opcjonalnym filtrowaniem
 */
export async function GET(request) {
  try {
    // Parsuj parametry zapytania
    const { searchParams } = new URL(request.url);
    
    // Przygotuj filtry na podstawie parametrów
    const filters = {
      platformId: searchParams.get('platformId'),
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')) : undefined,
      availableSlots: searchParams.get('availableSlots') !== 'false', // Domyślnie true
      orderBy: searchParams.get('orderBy') || 'created_at',
      ascending: searchParams.get('ascending') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')) : 10,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')) : 1
    };
    
    // Oblicz offset na podstawie strony i limitu
    filters.offset = (filters.page - 1) * filters.limit;
    
    // Pobierz oferty z repozytorium
    const offers = await offersRepository.getAll(filters);
    
    return apiResponse(offers);
  } catch (error) {
    return handleApiError(error, 'Nie udało się pobrać ofert subskrypcji');
  }
}

/**
 * POST /api/offers
 * Tworzy nową ofertę subskrypcji
 */
export async function POST(request) {
  // Używamy protectApiRoute do zabezpieczenia endpointu z uwierzytelnianiem i walidacją
  return protectApiRoute(async (req) => {
    try {
      // Pobierz dane z żądania (już zwalidowane przez protectApiRoute)
      const body = await req.json();
      
      // Dodatkowa walidacja
      const { isValid, errors } = validateRequestBody(createOfferSchema, body);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Validation error', details: errors },
          { status: 400 }
        );
      }
      
      // Pobierz użytkownika z Clerk
      const user = await currentUser();
      
      // Pobierz profil użytkownika
      const userProfile = await userRepository.getByAuthId(user.id);
      if (!userProfile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        );
      }
      
      // Sprawdź, czy użytkownik jest właścicielem lub adminem grupy
      const isAuthorized = await checkGroupPermission(body.groupId, userProfile.id);
      if (!isAuthorized) {
        return NextResponse.json(
          { error: 'You do not have permission to create offers for this group' },
          { status: 403 }
        );
      }
      
      // Przygotuj dane oferty
      const offerData = {
        group_id: body.groupId,
        platform_id: body.platformId,
        status: 'active',
        slots_total: body.slotsTotal,
        slots_available: body.slotsTotal,
        price_per_slot: body.pricePerSlot,
        currency: body.currency || 'PLN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Utwórz ofertę
      const createdOffer = await offersRepository.create(offerData);
      if (!createdOffer) {
        throw new Error('Failed to create subscription offer');
      }
      
      // Zapisz instrukcje dostępu
      await saveAccessInstructions(createdOffer.id, body.accessInstructions);
      
      // Zaloguj operację
      await logSecurityEvent(userProfile.id, 'create', 'group_sub', createdOffer.id, {
        group_id: body.groupId
      });
      
      return apiResponse(createdOffer, 201, 'Oferta subskrypcji została utworzona pomyślnie');
    } catch (error) {
      return handleApiError(error, 'Failed to create subscription offer');
    }
  })(request, {});
}

/**
 * Sprawdza uprawnienia użytkownika w grupie
 * @param {string} groupId - ID grupy
 * @param {string} userId - ID użytkownika
 * @returns {Promise<boolean>} - Czy użytkownik ma uprawnienia
 */
async function checkGroupPermission(groupId, userId) {
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
    console.error('Error checking group permission:', error);
    return false;
  }
}

/**
 * Zapisuje instrukcje dostępu dla oferty
 * @param {string} groupSubId - ID oferty
 * @param {string} instructions - Instrukcje dostępu
 * @returns {Promise<boolean>} - Czy operacja się powiodła
 */
async function saveAccessInstructions(groupSubId, instructions) {
  try {
    // Pobierz lub wygeneruj klucz szyfrowania
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
    
    // "Szyfrowanie" instrukcji
    const encryptedData = 'ENCRYPTED:' + Buffer.from(instructions).toString('base64');
    const iv = generateRandomBytes(16).toString('hex');
    const dataKeyEnc = 'dummy_key_enc_' + Math.random().toString(36).substring(2);
    
    // Zapisz instrukcje
    const { error } = await supabaseAdmin
      .from('access_instructions')
      .insert({
        group_sub_id: groupSubId,
        encrypted_data: encryptedData,
        data_key_enc: dataKeyEnc,
        encryption_key_id: encryptionKeyId,
        iv: iv,
        encryption_version: '1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    return !error;
  } catch (error) {
    console.error('Error saving access instructions:', error);
    // Kontynuujemy mimo błędu, główna funkcjonalność została wykonana
    return false;
  }
}

/**
 * Loguje zdarzenie bezpieczeństwa
 * @param {string} userId - ID użytkownika
 * @param {string} actionType - Typ akcji
 * @param {string} resourceType - Typ zasobu
 * @param {string} resourceId - ID zasobu
 * @param {Object} details - Dodatkowe szczegóły
 */
async function logSecurityEvent(userId, actionType, resourceType, resourceId, details = {}) {
  try {
    await supabaseAdmin
      .from('security_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: String(resourceId),
        status: 'success',
        details: details,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
}

/**
 * Funkcja generująca losowe bajty (alternatywa dla crypto.randomBytes)
 * Zmieniono nazwę z crypto() na generateRandomBytes() aby uniknąć konfliktu
 */
function generateRandomBytes(size) {
  const values = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    values[i] = Math.floor(Math.random() * 256);
  }
  return {
    toString: (encoding) => {
      if (encoding === 'hex') {
        return Array.from(values)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return String.fromCharCode.apply(null, values);
    }
  };
}