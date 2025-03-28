// src/components/offers/OfferCard.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

/**
 * Displays a card for a subscription offer
 */
const OfferCard = ({ offer }) => {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Handle apply button click
  const handleApply = () => {
    // If user is not signed in, redirect to sign in
    if (!isSignedIn) {
      router.push('/sign-in?redirect=' + encodeURIComponent(`/offers/${offer.id}`));
      return;
    }

    // Otherwise, navigate to the offer details page
    router.push(`/offers/${offer.id}`);
  };

  // Format price with currency
  const formatPrice = (price, currency = 'PLN') => {
    return `${price.toFixed(2)} ${currency}`;
  };

  // Get platform icon
  const getPlatformIcon = () => {
    const platform = offer.subscription_platforms;
    
    // If platform has an icon, use it
    if (platform && platform.icon) {
      return (
        <Image 
          src={`/images/platforms/${platform.icon}`} 
          alt={platform.name} 
          width={48} 
          height={48} 
          className="rounded-full"
        />
      );
    }
    
    // Otherwise, use the first letter of the platform name
    return (
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
        <span className="text-gray-500 text-lg font-medium">
          {platform?.name?.charAt(0) || '?'}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="mr-4">
            {getPlatformIcon()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {offer.subscription_platforms?.name || 'Unknown Platform'}
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
            <span className="text-gray-600">Cena za miejsce</span>
            <span className="font-medium text-gray-900">
              {formatPrice(offer.price_per_slot, offer.currency)}
            </span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Dostępne miejsca</span>
            <span className="font-medium text-gray-900">
              {offer.slots_available} / {offer.slots_total}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Natychmiastowy dostęp</span>
            <span className={`font-medium ${offer.instant_access ? 'text-green-600' : 'text-gray-500'}`}>
              {offer.instant_access ? 'Tak' : 'Nie'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full mr-2 overflow-hidden">
            {offer.owner?.user_profiles?.avatar_url ? (
              <Image 
                src={offer.owner.user_profiles.avatar_url} 
                alt={offer.owner.user_profiles.display_name} 
                width={32} 
                height={32}
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
            <span className="text-sm font-medium text-gray-700">
              {offer.owner?.user_profiles?.display_name || 'Unknown'}
            </span>
            {offer.owner?.user_profiles?.verification_level === 'trusted' && (
              <span className="ml-1 text-xs text-green-600">✓</span>
            )}
          </div>
        </div>
        
        <button 
          className={`px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            isLoading ? 'opacity-75 cursor-not-allowed' : ''
          }`}
          onClick={handleApply}
          disabled={isLoading}
        >
          {isLoading ? 'Proszę czekać...' : 'Dołącz'}
        </button>
      </div>
    </div>
  );
};

export default OfferCard;
