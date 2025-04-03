// src/components/offers/OffersList.jsx
'use client';

import { useState, useEffect } from 'react';
import OfferCard from './OfferCard';
import FilterBar from './FilterBar';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import { toast } from 'react-hot-toast';

/**
 * Displays a list of subscription offers with filtering capabilities
 */
const OffersList = ({ initialOffers = null, platformId = null }) => {
  const [offers, setOffers] = useState(initialOffers || []);
  const [isLoading, setIsLoading] = useState(!initialOffers);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    platformId: platformId || '',
    instantAccess: false,
    minPrice: '',
    maxPrice: '',
    orderBy: 'created_at',
    ascending: false
  });

  // Load offers based on filters
  useEffect(() => {
    // Jeśli mamy początkowe oferty i nie ma filtrów, użyj ich
    if (initialOffers && 
        !filters.platformId && 
        !filters.instantAccess && 
        !filters.minPrice && 
        !filters.maxPrice) {
      return;
    }
    
    const fetchOffers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Build query string from filters
        const queryParams = new URLSearchParams();
        
        if (filters.platformId) {
          queryParams.append('platformId', filters.platformId);
        }
        
        if (filters.instantAccess) {
          queryParams.append('instantAccess', 'true');
        }
        
        if (filters.minPrice) {
          queryParams.append('minPrice', filters.minPrice);
        }
        
        if (filters.maxPrice) {
          queryParams.append('maxPrice', filters.maxPrice);
        }
        
        queryParams.append('orderBy', filters.orderBy);
        queryParams.append('ascending', filters.ascending);
        queryParams.append('limit', '20');
        
        // Fetch offers with retry mechanism
        let response;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            response = await fetch(`/api/offers?${queryParams.toString()}`);
            
            if (response.ok) break;
            
            // If error, increment counter and retry
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
        
        const data = await response.json();
        
        // Validate data
        if (!data) {
          throw new Error('Otrzymano puste dane z serwera');
        }
        
        if (!Array.isArray(data)) {
          console.warn('Nieoczekiwany format danych:', data);
          setOffers([]);
        } else {
          setOffers(data);
        }
      } catch (err) {
        console.error('Error fetching offers:', err);
        setError(err.message || 'Nie udało się pobrać ofert subskrypcji. Spróbuj ponownie.');
        toast.error('Problem z pobraniem ofert. Odświeżamy stronę...');
        
        // Fallback - po 3 sekundach spróbuj ponownie
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOffers();
  }, [filters, initialOffers]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
  };

  // Handle error retry
  const handleRetry = () => {
    setError(null);
    setFilters({
      platformId: '',
      instantAccess: false,
      minPrice: '',
      maxPrice: '',
      orderBy: 'created_at',
      ascending: false
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  }

  // Render error state
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

  // Render empty state
  if (offers.length === 0) {
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

  // Render offers list
  return (
    <div>
      <FilterBar filters={filters} onFilterChange={handleFilterChange} />
      
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>
      
      {offers.length >= 20 && (
        <div className="mt-8 text-center">
          <button 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
            onClick={() => {
              // Implementacja ładowania większej liczby ofert
              toast.info('Ładowanie większej liczby ofert...');
            }}
          >
            Pokaż więcej ofert
          </button>
        </div>
      )}
    </div>
  );
};

export default OffersList;