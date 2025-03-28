// src/components/offers/OffersList.jsx
'use client';

import { useState, useEffect } from 'react';
import OfferCard from './OfferCard';
import FilterBar from './FilterBar';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';

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
    if (initialOffers && !filters.platformId && !filters.instantAccess && !filters.minPrice && !filters.maxPrice) {
      // If we have initial offers and no filters, use them
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
        queryParams.append('limit', '10');
        
        // Fetch offers from API
        const response = await fetch(`/api/offers?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch offers');
        }
        
        const data = await response.json();
        setOffers(data);
      } catch (err) {
        console.error('Error fetching offers:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOffers();
  }, [filters, initialOffers]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters
    }));
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
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-800">Wystąpił błąd: {error}</p>
        <button 
          className="mt-2 text-red-600 underline"
          onClick={() => {
            setError(null);
            setFilters({
              platformId: '',
              instantAccess: false,
              minPrice: '',
              maxPrice: '',
              orderBy: 'created_at',
              ascending: false
            });
          }}
        >
          Spróbuj ponownie
        </button>
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
          description="Spróbuj zmienić filtry lub sprawdź później."
          actionText="Wyczyść filtry"
          onAction={() => {
            setFilters({
              platformId: '',
              instantAccess: false,
              minPrice: '',
              maxPrice: '',
              orderBy: 'created_at',
              ascending: false
            });
          }}
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
    </div>
  );
};

export default OffersList;
