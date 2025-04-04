'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import EditOfferForm from '@/components/offers/EditOfferForm';

export default function EditOfferPage() {
  const { id: groupId, offerId } = useParams();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edytuj ofertę subskrypcji</h1>
        <Link href={`/groups/${groupId}`} className="text-indigo-600 hover:text-indigo-800">
          &larr; Wróć do grupy
        </Link>
      </div>
      
      <EditOfferForm offerId={offerId} />
    </div>
  );
}