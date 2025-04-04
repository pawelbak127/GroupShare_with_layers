'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import CreateOfferForm from '@/components/offers/CreateOfferForm';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function NewOfferPage() {
  const { id: groupId } = useParams();
  const [platforms, setPlatforms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
      } catch (err) {
        console.error('Error fetching platforms:', err);
        setError('Nie udało się pobrać listy platform. Spróbuj ponownie później.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlatforms();
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          {error}
        </div>
        <div className="mt-4">
          <Link href={`/groups/${groupId}`} className="text-indigo-600 hover:text-indigo-800">
            &larr; Wróć do grupy
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Nowa oferta subskrypcji</h1>
        <Link href={`/groups/${groupId}`} className="text-indigo-600 hover:text-indigo-800">
          &larr; Wróć do grupy
        </Link>
      </div>
      
      <CreateOfferForm groupId={groupId} platforms={platforms} />
    </div>
  );
}