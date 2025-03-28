'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';

/**
 * Komponent do generowania jednorazowych tokenów dostępu
 */
const AccessTokenGenerator = ({ applicationId }) => {
  const [accessUrl, setAccessUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateToken = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch(`/api/applications/${applicationId}/access-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Nie udało się wygenerować tokenu');
      }
      
      setAccessUrl(data.accessUrl);
      toast.success('Token dostępu został wygenerowany');
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error(error.message || 'Wystąpił błąd podczas generowania tokenu');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(accessUrl)
      .then(() => {
        setCopied(true);
        toast.success('URL skopiowany do schowka');
        
        // Reset copied status after 2 seconds
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast.error('Nie udało się skopiować URL');
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <h3 className="text-sm font-medium text-gray-700">Jednorazowy dostęp</h3>
        <p className="text-xs text-gray-500 mt-1">
          Wygeneruj jednorazowy link dostępowy dla kupującego. Link będzie ważny przez 30 minut i może być użyty tylko raz.
        </p>
      </div>
      
      {!accessUrl ? (
        <button
          onClick={generateToken}
          className={`px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            isGenerating ? 'opacity-75 cursor-wait' : ''
          }`}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generowanie...' : 'Wygeneruj link dostępowy'}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="text"
              value={accessUrl}
              readOnly
              className="block w-full rounded-l-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-gray-50"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100"
              title="Kopiuj do schowka"
            >
              {copied ? (
                <CheckIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ClipboardIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={generateToken}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
              disabled={isGenerating}
            >
              Wygeneruj nowy
            </button>
            
            <button
              onClick={() => setAccessUrl('')}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-700">
        <strong>Uwaga:</strong> Link jest jednorazowy i wygaśnie po 30 minutach. Po wykorzystaniu konieczne będzie wygenerowanie nowego linku.
      </div>
    </div>
  );
};

export default AccessTokenGenerator;