// src/app/checkout/[id]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function CheckoutPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  
  const [purchase, setPurchase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('blik');
  
  useEffect(() => {
    // Przekieruj do logowania, jeśli użytkownik nie jest zalogowany
    if (isLoaded && !isSignedIn) {
      router.push(`/sign-in?redirect=${encodeURIComponent(`/checkout/${id}`)}`);
      return;
    }
    
    // Pobierz dane zakupu
    const fetchPurchase = async () => {
      try {
        const response = await fetch(`/api/purchases/${id}`);
        
        if (!response.ok) {
          throw new Error('Nie udało się pobrać danych zakupu');
        }
        
        const data = await response.json();
        setPurchase(data);
      } catch (error) {
        console.error('Error fetching purchase:', error);
        toast.error(error.message || 'Wystąpił błąd podczas pobierania danych zakupu');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isSignedIn) {
      fetchPurchase();
    }
  }, [id, isSignedIn, isLoaded, router]);
  
  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          purchaseId: id,
          paymentMethod: selectedPaymentMethod
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Błąd podczas przetwarzania płatności');
      }
      
      const paymentData = await response.json();
      
      // Przekieruj do strony płatności lub pokaż formularz BLIK
      if (selectedPaymentMethod === 'blik') {
        router.push(`/checkout/${id}/blik?payment_id=${paymentData.id}`);
      } else {
        // Przekieruj do zewnętrznego procesora płatności
        window.location.href = paymentData.payment_url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Wystąpił błąd podczas przetwarzania płatności');
      setIsProcessing(false);
    }
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!purchase) {
    return (
      <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-red-600 mb-2">Błąd</h2>
        <p className="text-gray-700">Nie udało się pobrać danych zakupu. Spróbuj ponownie później.</p>
        <button 
          onClick={() => router.push('/offers')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md"
        >
          Wróć do ofert
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto my-10 p-6">
      <h1 className="text-2xl font-bold mb-6">Zakup dostępu do subskrypcji</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Metoda płatności</h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="blik"
                  name="payment-method"
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  value="blik"
                  checked={selectedPaymentMethod === 'blik'}
                  onChange={() => setSelectedPaymentMethod('blik')}
                />
                <label htmlFor="blik" className="ml-3 block text-sm font-medium text-gray-700">
                  BLIK
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="card"
                  name="payment-method"
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  value="card"
                  checked={selectedPaymentMethod === 'card'}
                  onChange={() => setSelectedPaymentMethod('card')}
                />
                <label htmlFor="card" className="ml-3 block text-sm font-medium text-gray-700">
                  Karta płatnicza
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="transfer"
                  name="payment-method"
                  type="radio"
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  value="transfer"
                  checked={selectedPaymentMethod === 'transfer'}
                  onChange={() => setSelectedPaymentMethod('transfer')}
                />
                <label htmlFor="transfer" className="ml-3 block text-sm font-medium text-gray-700">
                  Przelew online
                </label>
              </div>
            </div>
            
            <button
              className={`mt-6 w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? 'Przetwarzanie...' : 'Zapłać'}
            </button>
          </div>
        </div>
        
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Podsumowanie</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Platforma:</span>
                <span className="font-medium">{purchase.group_sub.subscription_platforms.name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Cena za miejsce:</span>
                <span className="font-medium">{purchase.group_sub.price_per_slot.toFixed(2)} {purchase.group_sub.currency}</span>
              </div>
              
              <div className="border-t border-gray-200 my-2 pt-2">
                <div className="flex justify-between font-bold">
                  <span>Razem:</span>
                  <span>{purchase.group_sub.price_per_slot.toFixed(2)} {purchase.group_sub.currency}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              <p>Po dokonaniu płatności otrzymasz natychmiastowy dostęp do instrukcji dotyczących subskrypcji.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}