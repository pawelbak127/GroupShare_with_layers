'use client';

import { useState, useEffect } from 'react';
import OffersList from '@/components/offers/OffersList';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function OffersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/offers');
        
        if (!response.ok) {
          throw new Error('Failed to fetch offers');
        }
        
        const data = await response.json();
        setOffers(data);
      } catch (err) {
        console.error('Error fetching offers:', err);
        setError('Failed to load subscription offers. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOffers();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Przeglądaj oferty</h1>
        <p className="text-gray-600 mt-1">
          Znajdź idealną subskrypcję grupową i zaoszczędź na miesięcznych opłatach.
        </p>
      </div>
      
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          {error}
        </div>
      ) : isLoading ? (
        <LoadingSpinner />
      ) : (
        <OffersList initialOffers={offers} />
      )}
    </div>
  );
}