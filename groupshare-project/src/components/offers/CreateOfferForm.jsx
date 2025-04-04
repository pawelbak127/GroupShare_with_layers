'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import InstructionForm from '../secure-access/InstructionForm';

export default function CreateOfferForm({ groupId, platforms }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    groupId,
    platformId: '',
    slotsTotal: 1,
    pricePerSlot: '',
    currency: 'PLN',
    accessInstructions: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'slotsTotal' || name === 'pricePerSlot' 
        ? parseFloat(value) || '' 
        : value
    }));
  };

  const handleFirstStepSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.platformId) {
      toast.error('Wybierz platformę subskrypcji');
      return;
    }
    
    if (!formData.slotsTotal || formData.slotsTotal < 1) {
      toast.error('Liczba miejsc musi być większa od 0');
      return;
    }
    
    if (!formData.pricePerSlot || formData.pricePerSlot <= 0) {
      toast.error('Cena za miejsce musi być większa od 0');
      return;
    }
    
    setStep(2);
  };

  const handleInstructionsSubmit = (instructionsData) => {
    setFormData(prev => ({
      ...prev,
      accessInstructions: instructionsData
    }));
    
    submitOffer();
  };

  const submitOffer = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create offer');
      }
      
      const offer = await response.json();
      
      toast.success('Oferta została utworzona');
      router.push(`/groups/${groupId}?tab=offers`);
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error(error.message || 'Wystąpił błąd podczas tworzenia oferty');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Utwórz nową ofertę subskrypcji</h2>
        
        <form onSubmit={handleFirstStepSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="platformId" className="block text-sm font-medium text-gray-700 mb-1">
                Platforma subskrypcji *
              </label>
              <select
                id="platformId"
                name="platformId"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.platformId}
                onChange={handleChange}
                required
              >
                <option value="">Wybierz platformę</option>
                {platforms?.map(platform => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="slotsTotal" className="block text-sm font-medium text-gray-700 mb-1">
                Liczba dostępnych miejsc *
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
              <label htmlFor="pricePerSlot" className="block text-sm font-medium text-gray-700 mb-1">
                Cena za miejsce (miesięcznie) *
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
              >
                Dalej: Instrukcje dostępowe
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }
  
  if (step === 2) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center mb-4">
          <button 
            onClick={() => setStep(1)}
            className="text-indigo-600 hover:text-indigo-800 mr-2"
          >
            &larr; Wróć
          </button>
          <h2 className="text-xl font-semibold">Dodaj instrukcje dostępowe</h2>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <p className="text-sm text-yellow-700">
            <strong>Ważne:</strong> Wszystkie oferty wymagają teraz instrukcji dostępowych, które będą automatycznie 
            udostępniane kupującym po dokonaniu płatności. Wprowadź dokładne dane potrzebne do uzyskania dostępu.
          </p>
        </div>
        
        <InstructionForm 
          groupSubId={null} // będzie ustawione po utworzeniu oferty
          onSuccess={handleInstructionsSubmit}
        />
      </div>
    );
  }
}