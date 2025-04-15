// src/components/offers/FilterBar.jsx
'use client';

import { useState, useEffect } from 'react';

/**
 * Filter and sort bar for subscription offers
 */
const FilterBar = ({ filters, onFilterChange }) => {
  const [platforms, setPlatforms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch platforms for filter dropdown
  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/platforms');
        
        if (!response.ok) {
          throw new Error('Failed to fetch platforms');
        }
        
        const data = await response.json();
        setPlatforms(data);
      } catch (error) {
        console.error('Error fetching platforms:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlatforms();
  }, []);

  // Handle platform filter change
  const handlePlatformChange = (e) => {
    onFilterChange({
      platformId: e.target.value
    });
  };

  // Handle price filter changes
  const handlePriceChange = (type, e) => {
    const value = e.target.value;
    
    // Only update if empty or a valid number
    if (value === '' || (!isNaN(parseFloat(value)) && isFinite(value))) {
      onFilterChange({
        [type]: value
      });
    }
  };

  // Handle sorting changes - FIXED for slots_available sorting
  const handleSortChange = (e) => {
    const [orderBy, direction] = e.target.value.split(':');
    
    onFilterChange({
      orderBy,
      ascending: direction === 'asc'
    });
  };

  // Get current sort value for the select
  const getSortValue = () => {
    return `${filters.orderBy}:${filters.ascending ? 'asc' : 'desc'}`;
  };

  // Toggle expanded/collapsed state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Clear all filters
  const clearFilters = () => {
    onFilterChange({
      platformId: '',
      minPrice: '',
      maxPrice: '',
      orderBy: 'created_at',
      ascending: false
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-sm">
      <div className="p-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
        {/* Sort dropdown - always visible */}
        <div className="w-full md:w-auto">
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
            Sortuj według
          </label>
          <select
            id="sort"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={getSortValue()}
            onChange={handleSortChange}
          >
            <option value="created_at:desc">Najnowsze</option>
            <option value="created_at:asc">Najstarsze</option>
            <option value="price_per_slot:asc">Cena: od najniższej</option>
            <option value="price_per_slot:desc">Cena: od najwyższej</option>
            <option value="slots_available:desc">Dostępne miejsca: najwięcej</option>
          </select>
        </div>

        {/* Platform filter - always visible */}
        <div className="w-full md:w-auto">
          <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
            Platforma
          </label>
          <select
            id="platform"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={filters.platformId}
            onChange={handlePlatformChange}
            disabled={isLoading}
          >
            <option value="">Wszystkie platformy</option>
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle button for more filters */}
        <div className="w-full md:w-auto flex justify-end">
          <button
            type="button"
            className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm font-medium"
            onClick={toggleExpanded}
          >
            {isExpanded ? (
              <>
                Mniej filtrów
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </>
            ) : (
              <>
                Więcej filtrów
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Additional filters - expanded/collapsed */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Price range filters */}
            <div>
              <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700 mb-1">
                Cena minimalna (PLN)
              </label>
              <input
                type="text"
                id="minPrice"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={filters.minPrice}
                onChange={(e) => handlePriceChange('minPrice', e)}
                placeholder="np. 10"
              />
            </div>
            <div>
              <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700 mb-1">
                Cena maksymalna (PLN)
              </label>
              <input
                type="text"
                id="maxPrice"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={filters.maxPrice}
                onChange={(e) => handlePriceChange('maxPrice', e)}
                placeholder="np. 50"
              />
            </div>
          </div>

          {/* Clear filters button */}
          <div className="mt-4 text-right">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={clearFilters}
            >
              Wyczyść filtry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;