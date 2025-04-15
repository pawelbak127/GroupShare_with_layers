// src/hooks/api-hooks.js
'use client';

import { useCallback } from 'react';
import { toast } from '@/lib/utils/notification';

/**
 * Hook do komunikacji z API ofert
 * @returns {Object} Metody do interakcji z API ofert
 */
export function useOffersApi() {
  /**
   * Pobiera oferty z API z odpowiednimi filtrami
   * @param {Object} filters - Filtry do zastosowania
   * @returns {Promise<Array>} - Lista ofert
   */
  const fetchOffers = useCallback(async (filters = {}) => {
    try {
      // Buduj parametry URL z filtrów
      const queryParams = new URLSearchParams();
      
      if (filters.platformId) {
        queryParams.append('platformId', filters.platformId);
      }
      
      if (filters.minPrice) {
        queryParams.append('minPrice', filters.minPrice);
      }
      
      if (filters.maxPrice) {
        queryParams.append('maxPrice', filters.maxPrice);
      }
      
      // Dodaj domyślne wartości dla pozostałych parametrów
      queryParams.append('orderBy', filters.orderBy || 'created_at');
      queryParams.append('ascending', filters.ascending || false);
      queryParams.append('limit', filters.limit || 10);
      queryParams.append('page', filters.page || 1);
      
      // Pobierz oferty z mechanizmem ponownych prób
      let response;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          response = await fetch(`/api/offers?${queryParams.toString()}`);
          
          if (response.ok) break;
          
          // Jeśli błąd, zwiększ licznik i spróbuj ponownie
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        } catch (err) {
          retryCount++;
          if (retryCount >= maxRetries) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`Nie udało się pobrać ofert: ${response?.status} ${response?.statusText}`);
      }
      
      const responseData = await response.json();
      
      // Sprawdź, czy odpowiedź zawiera dane
      if (!responseData) {
        throw new Error('Otrzymano niepoprawny format danych z serwera');
      }
      
      // Obsługa obu formatów API - stary i nowy
      return responseData.data || responseData;
    } catch (error) {
      console.error('Error in fetchOffers:', error);
      toast.error('Nie udało się pobrać ofert');
      throw error;
    }
  }, []);
  
  /**
   * Pobiera szczegóły oferty
   * @param {string} offerId - ID oferty
   * @returns {Promise<Object>} - Szczegóły oferty
   */
  const fetchOfferDetails = useCallback(async (offerId) => {
    try {
      const response = await fetch(`/api/offers/${offerId}`);
      
      if (!response.ok) {
        throw new Error(`Nie udało się pobrać szczegółów oferty: ${response.status}`);
      }
      
      const data = await response.json();
      // Obsługa obu formatów API - stary i nowy
      return data.data || data;
    } catch (error) {
      console.error('Error in fetchOfferDetails:', error);
      toast.error('Nie udało się pobrać szczegółów oferty');
      throw error;
    }
  }, []);
  
  /**
   * Inicjuje zakup oferty
   * @param {string} offerId - ID oferty
   * @returns {Promise<Object>} - Dane zakupu
   */
  const purchaseOffer = useCallback(async (offerId) => {
    try {
      const response = await fetch(`/api/offers/${offerId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Błąd podczas inicjowania zakupu');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in purchaseOffer:', error);
      toast.error(error.message || 'Wystąpił błąd podczas inicjowania zakupu');
      throw error;
    }
  }, []);
  
  return {
    fetchOffers,
    fetchOfferDetails,
    purchaseOffer
  };
}

/**
 * Hook do komunikacji z API płatności
 * @returns {Object} Metody do interakcji z API płatności
 */
export function usePaymentApi() {
  /**
   * Przetwarza płatność
   * @param {string} purchaseId - ID zakupu
   * @param {string} paymentMethod - Metoda płatności
   * @returns {Promise<Object>} - Wynik płatności
   */
  const processPayment = useCallback(async (purchaseId, paymentMethod) => {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          purchaseId,
          paymentMethod
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Błąd podczas przetwarzania płatności');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Wystąpił błąd podczas przetwarzania płatności');
      throw error;
    }
  }, []);
  
  /**
   * Potwierdza poprawność dostępu
   * @param {string} purchaseId - ID zakupu
   * @param {boolean} isWorking - Czy dostęp działa poprawnie
   * @returns {Promise<Object>} - Wynik potwierdzenia
   */
  const confirmAccess = useCallback(async (purchaseId, isWorking) => {
    try {
      const response = await fetch(`/api/purchases/${purchaseId}/confirm-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isWorking
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Błąd podczas potwierdzania dostępu');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error confirming access:', error);
      toast.error(error.message || 'Wystąpił błąd podczas potwierdzania dostępu');
      throw error;
    }
  }, []);
  
  return {
    processPayment,
    confirmAccess
  };
}