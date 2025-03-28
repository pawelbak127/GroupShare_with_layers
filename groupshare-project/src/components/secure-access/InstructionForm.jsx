'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

/**
 * Formularz do wprowadzania instrukcji dostępowych dla oferty subskrypcji
 */
const InstructionForm = ({ groupSubId, onSuccess }) => {
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!instructions.trim()) {
      toast.error('Instrukcje dostępowe nie mogą być puste');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/access-instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupSubId,
          instructions,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Nie udało się zapisać instrukcji');
      }
      
      toast.success('Instrukcje zostały bezpiecznie zaszyfrowane i zapisane');
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      // Odśwież dane
      router.refresh();
    } catch (error) {
      console.error('Error saving instructions:', error);
      toast.error(error.message || 'Wystąpił błąd podczas zapisywania instrukcji');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
          Instrukcje dostępowe
        </label>
        <div className="text-xs text-gray-500 mb-2">
          Wprowadź szczegółowe instrukcje, jak uzyskać dostęp do subskrypcji. Instrukcje zostaną zaszyfrowane i będą dostępne tylko dla zatwierdzonych użytkowników.
        </div>
        <textarea
          id="instructions"
          name="instructions"
          rows={6}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          placeholder="Np. Dane logowania, URL, kroki konfiguracji..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Ważna informacja o bezpieczeństwie</h3>
            <div className="mt-1 text-xs text-yellow-700">
              Wprowadzone dane zostaną zaszyfrowane i będą widoczne tylko dla zatwierdzonych użytkowników. Nie będziemy przechowywać ich w formie niezaszyfrowanej.
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className={`px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            isSubmitting ? 'opacity-75 cursor-wait' : ''
          }`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Zapisywanie...' : 'Zapisz instrukcje'}
        </button>
      </div>
    </form>
  );
};

export default InstructionForm;