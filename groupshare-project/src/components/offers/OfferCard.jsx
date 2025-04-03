// src/components/offers/OfferCard.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';

/**
 * Displays a card for a subscription offer with direct purchase capability
 */
const OfferCard = ({ offer }) => {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Handle direct purchase flow
  const handlePurchase = async () => {
    if (!isSignedIn) {
      router.push('/sign-in?redirect=' + encodeURIComponent(`/offers/${offer.id}/purchase`));
      return;
    }

    setIsLoading(true);
    try {
      // Najpierw utwórz aplikację
      const applicationResponse = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupSubId: offer.id,
          message: 'Zakup bezpośredni',
          directPurchase: true // Flaga wskazująca na natychmiastowy zakup
        }),
      });

      if (!applicationResponse.ok) {
        const errorData = await applicationResponse.json();
        throw new Error(errorData.error || 'Nie udało się złożyć zamówienia');
      }

      const application = await applicationResponse.json();
      
      // Po pomyślnym utworzeniu aplikacji przejdź do płatności
      router.push(`/applications/${application.id}/payment`);
    } catch (error) {
      console.error('Error during purchase:', error);
      toast.error(error.message || 'Wystąpił błąd podczas zakupu');
      setIsLoading(false);
    }
  };

  // Format price with currency
  const formatPrice = (price, currency = 'PLN') => {
    return `${price.toFixed(2)} ${currency}`;
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
  };

  // Get platform icon with fallback
  const getPlatformIcon = () => {
    const platform = offer.subscription_platforms;
    
    // Fallback if image loading fails or no icon
    if (imageError || !platform?.icon) {
      return (
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <span className="text-indigo-600 text-lg font-medium">
            {platform?.name?.charAt(0) || '?'}
          </span>
        </div>
      );
    }
    
    // Try to load the platform icon
    return (
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
        <Image 
          src={`/images/platforms/${platform.icon}`}
          alt={platform.name}
          width={48}
          height={48}
          onError={handleImageError}
          className="rounded-full"
        />
      </div>
    );
  };

  // Get verification badge for seller
  const getVerificationBadge = (verificationLevel) => {
    if (verificationLevel === 'trusted') {
      return (
        <span className="ml-1 bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full">
          Zweryfikowany
        </span>
      );
    }
    if (verificationLevel === 'verified') {
      return (
        <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">
          Potwierdzony
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="mr-4">
            {getPlatformIcon()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {offer.subscription_platforms?.name || 'Nieznana platforma'}
            </h3>
            <div className="flex items-center mt-1">
              <span className="text-sm text-gray-600 mr-2">
                {offer.subscription_platforms?.requirements_text || 'Standardowe zasady'}
              </span>
              <span className="text-sm">
                {offer.subscription_platforms?.requirements_icon || '✓'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Cena za miejsce:</span>
            <span className="font-medium text-gray-900">
              {formatPrice(offer.price_per_slot, offer.currency)} / mies.
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
        
        {/* Opcjonalny opis oferty */}
        {offer.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {offer.description}
          </p>
        )}
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full mr-2 overflow-hidden">
            {offer.owner?.user_profiles?.avatar_url ? (
              <Image 
                src={offer.owner.user_profiles.avatar_url} 
                alt={offer.owner.user_profiles.display_name || 'Sprzedawca'}
                width={32}
                height={32}
                className="rounded-full"
                onError={(e) => e.target.style.display = 'none'}
              />
            ) : (
              <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                <span className="text-indigo-600 text-xs font-medium">
                  {offer.owner?.user_profiles?.display_name?.charAt(0) || '?'}
                </span>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">
                {offer.owner?.user_profiles?.display_name || 'Sprzedawca'}
              </span>
              {getVerificationBadge(offer.owner?.user_profiles?.verification_level)}
            </div>
            {offer.owner?.user_profiles?.rating_count > 0 && (
              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                <span className="flex items-center text-yellow-500 mr-1">
                  ★ {offer.owner?.user_profiles?.rating_avg?.toFixed(1) || '0.0'}
                </span>
                <span>({offer.owner?.user_profiles?.rating_count || 0})</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Przycisk zakupu */}
        <button 
          className={`px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          onClick={handlePurchase}
          disabled={isLoading || offer.slots_available <= 0}
        >
          {isLoading ? 'Przetwarzanie...' : 
           offer.slots_available <= 0 ? 'Brak miejsc' : 'Kup teraz'}
        </button>
      </div>
    </div>
  );
};

export default OfferCard;