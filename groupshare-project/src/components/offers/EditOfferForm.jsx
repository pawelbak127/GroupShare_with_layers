'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import InstructionForm from '../secure-access/InstructionForm';

export default function EditOfferForm({ offerId }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offer, setOffer] = useState(null);
  const [formData, setFormData] = useState({
    slotsTotal: 0,
    slotsAvailable: 0,
    pricePerSlot: '',
    status: 'active',
    accessInstructions: ''
  });
  const [showInstructionForm, setShowInstructionForm] = useState(false);

  useEffect(() => {
    if (offerId) {
      fetchOfferDetails();
    }
  }, [offerId]);

  const fetchOfferDetails = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/offers/${offerId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch offer details');
      }
      
      const offerData = await response.json();
      setOffer(offerData);
      
      setFormData({
        slotsTotal: offerData.slots_total,
        slotsAvailable: offerData.slots_available,
        pricePerSlot: offerData.price_per_slot,
        status: offerData.status,
        accessInstructions: '' // Instrukcje są zarządzane osobno
      });
    } catch (error) {
      console.error('Error fetching offer:', error);
      toast.error('Nie udało się pobrać szczegółów oferty');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'slotsTotal' || name === 'slotsAvailable' || name === 'pricePerSlot' 
        ? parseFloat(value) || '' 
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update offer');
      }
      
      toast.success('Oferta została zaktualizowana');
      router.refresh();
    } catch (error) {
      console.error('Error updating offer:', error);
      toast.error(error.message || 'Wystąpił błąd podczas aktualizacji oferty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstructionsSuccess = () => {
    toast.success('Instrukcje dostępowe zostały zaktualizowane');
    setShowInstructionForm(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-gray-600">Ładowanie...</span>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <p className="text-red-600">Nie udało się załadować oferty</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Edytuj ofertę subskrypcji</h2>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="space-y-4">
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1">
              Platforma
            </p>
            <p className="text-gray-900">
              {offer.subscription_platforms?.name || 'Nieznana platforma'}
            </p>
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="active">Aktywna</option>
              <option value="inactive">Nieaktywna</option>
              <option value="full">Wszystkie miejsca zajęte</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="slotsTotal" className="block text-sm font-medium text-gray-700 mb-1">
              Liczba dostępnych miejsc (całkowita)
            </label>
            <input
              type="number"
              id="slotsTotal"
              name="slotsTotal"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={formData.slotsTotal}
              onChange={handleChange}
              min="1"
              max="10"
              required
            />
          </div>
          
          <div>
            <label htmlFor="slotsAvailable" className="block text-sm font-medium text-gray-700 mb-1">
              Liczba dostępnych miejsc (aktualnie)
            </label>
            <input
              type="number"
              id="slotsAvailable"
              name="slotsAvailable"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={formData.slotsAvailable}
              onChange={handleChange}
              min="0"
              max={formData.slotsTotal}
              required
            />
          </div>
          
          <div>
            <label htmlFor="pricePerSlot" className="block text-sm font-medium text-gray-700 mb-1">
              Cena za miejsce (miesięcznie)
            </label>
            <div className="relative">
              <input
                type="number"
                id="pricePerSlot"
                name="pricePerSlot"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 pl-8 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.pricePerSlot}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                required
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="text-gray-500">PLN</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </div>
        </div>
      </form>
      
      <div className="border-t border-gray-200 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Instrukcje dostępowe</h3>
          <button
            type="button"
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => setShowInstructionForm(!showInstructionForm)}
          >
            {showInstructionForm ? 'Anuluj' : 'Aktualizuj instrukcje dostępowe'}
          </button>
        </div>
        
        {!showInstructionForm ? (
          <div className="bg-gray-50 rounded-md p-4 text-gray-700">
            <p>Instrukcje dostępowe są zaszyfrowane i bezpiecznie przechowywane. Możesz je zaktualizować w dowolnym momencie.</p>
          </div>
        ) : (
          <InstructionForm 
            groupSubId={offerId}
            onSuccess={handleInstructionsSuccess}
          />
        )}
      </div>
    </div>
  );
}