// src/components/offers/OffersList.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import OfferCard from './OfferCard';
import FilterBar from './FilterBar';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import { toast } from '@/lib/utils/notification';
import { useOffersApi } from '@/hooks/api-hooks';

/**
 * Hook do zarządzania stanem filtrów ofert
 * @param {Object} initialFilters - Początkowe filtry
 * @returns {Array} - [filters, setFilter, resetFilters]
 */
function useOfferFilters(initialFilters = {}) {
  const defaultFilters = {
    platformId: '',
    minPrice: '',
    maxPrice: '',
    orderBy: 'created_at',
    ascending: false,
    ...initialFilters
  };
  
  const [filters, setFilters] = useState(defaultFilters);
  
  // Funkcja do aktualizacji pojedynczego filtra
  const setFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);
  
  // Funkcja do resetowania wszystkich filtrów do wartości początkowych
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [defaultFilters]);
  
  return [filters, setFilter, resetFilters];
}

/**
 * Wyświetla listę ofert subskrypcji z możliwością filtrowania
 */
export default function OffersList({ initialOffers = null, platformId = null }) {
  // Stan komponentu
  const [offers, setOffers] = useState(initialOffers || []);
  const [isLoading, setIsLoading] = useState(!initialOffers);
  const [error, setError] = useState(null);
  
  // Użyj hooka do zarządzania filtrami
  const [filters, setFilter, resetFilters] = useOfferFilters({ platformId });
  
  // Użyj hooka do komunikacji z API
  const { fetchOffers } = useOffersApi();
  
  // Pobieranie ofert
  const loadOffers = useCallback(async () => {
    // Jeśli mamy początkowe oferty (nie null i nie pusta tablica) i brak własnych filtrów, użyj ich
    if (initialOffers && 
        Array.isArray(initialOffers) && 
        initialOffers.length > 0 && 
        !filters.platformId && 
        !filters.minPrice && 
        !filters.maxPrice) {
      console.log('Using initial offers:', initialOffers.length);
      setOffers(initialOffers);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching offers with filters:', filters);
      const data = await fetchOffers(filters);
      
      // Ensure we always have an array to work with
      const offersArray = Array.isArray(data) ? data : [];
      console.log('Received offers:', offersArray.length);
      setOffers(offersArray);
    } catch (err) {
      console.error('Error fetching offers:', err);
      setError(err.message || 'Nie udało się pobrać ofert subskrypcji. Spróbuj ponownie.');
      toast.error('Problem z pobraniem ofert. Odświeżamy stronę...');
      // Set empty array on error to avoid map errors
      setOffers([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, initialOffers, fetchOffers]);
  
  // Efekt do pobierania ofert po zmianie filtrów
  useEffect(() => {
    loadOffers();
  }, [loadOffers]);
  
  // Obsługa zmiany filtrów
  const handleFilterChange = (newFilters) => {
    // Aktualizuj każdy filtr
    Object.entries(newFilters).forEach(([key, value]) => {
      setFilter(key, value);
    });
  };
  
  // Obsługa błędów
  const handleRetry = () => {
    setError(null);
    resetFilters();
  };
  
  // Renderowanie stanu ładowania
  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  }
  
  // Renderowanie stanu błędu
  if (error) {
    return (
      <div>
        <FilterBar filters={filters} onFilterChange={handleFilterChange} />
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 mt-6">
          <p className="font-medium">Wystąpił błąd:</p>
          <p className="mt-1">{error}</p>
          <button 
            onClick={handleRetry}
            className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }
  
  // Renderowanie pustej listy
  if (!offers || offers.length === 0) {
    return (
      <div>
        <FilterBar filters={filters} onFilterChange={handleFilterChange} />
        <EmptyState 
          title="Brak ofert spełniających kryteria"
          description="Spróbuj zmienić filtry lub sprawdź ponownie później."
          actionText="Wyczyść filtry"
          onAction={handleRetry}
        />
      </div>
    );
  }
  
  // Renderowanie listy ofert
  return (
    <div>
      <FilterBar filters={filters} onFilterChange={handleFilterChange} />
      
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.isArray(offers) && offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
      
      {offers.length >= 20 && (
        <div className="mt-8 text-center">
          <button 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
            onClick={() => {
              setFilter('limit', (filters.limit || 20) + 10);
            }}
          >
            Pokaż więcej ofert
          </button>
        </div>
      )}
    </div>
  );
}