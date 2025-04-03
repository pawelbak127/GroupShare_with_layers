// src/components/offers/OfferCard.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';

const OfferCard = ({ offer }) => {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const handlePurchase = async () => {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect=${encodeURIComponent(`/offers/${offer.id}`)}`);
      return;
    }
    
    if (offer.slots_available <= 0) {
      toast.error('Brak dostępnych miejsc');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Sprawdź, czy oferta ma natychmiastowy dostęp
      if (!offer.instant_access) {
        toast.error('Ta oferta nie umożliwia natychmiastowego dostępu');
        setIsLoading(false);
        return;
      }
      
      // Utwórz rekord zakupu
      const response = await fetch(`/api/offers/${offer.id}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Błąd podczas inicjowania zakupu');
      }
      
      const { purchase } = await response.json();
      
      // Przekieruj do płatności
      router.push(`/checkout/${purchase.id}`);
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Wystąpił błąd podczas inicjowania zakupu');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Treść karty z informacjami o ofercie */}
      <div className="p-6">
        <div className="flex items-center mb-4">
          {/* Logo i nazwa platformy */}
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Cena za miejsce:</span>
            <span className="font-medium text-gray-900">
              {offer.price_per_slot.toFixed(2)} {offer.currency} / mies.
            </span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Dostępne miejsca:</span>
            <span className="font-medium text-gray-900">
              {offer.slots_available} / {offer.slots_total}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Natychmiastowy dostęp:</span>
            <span className={`font-medium ${offer.instant_access ? 'text-green-600' : 'text-gray-500'}`}>
              {offer.instant_access ? 'Tak' : 'Nie'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Przycisk zakupu */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          {/* Informacje o sprzedającym */}
        </div>
        
        <button 
          className={`px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            ${(!offer.instant_access || offer.slots_available <= 0 || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handlePurchase}
          disabled={!offer.instant_access || offer.slots_available <= 0 || isLoading}
        >
          {isLoading ? 'Przetwarzanie...' : 
           offer.slots_available <= 0 ? 'Brak miejsc' : 
           !offer.instant_access ? 'Niedostępne' : 'Kup teraz'}
        </button>
      </div>
    </div>
  );
};

export default OfferCard;