import Link from 'next/link';

export default function LoginRedirect({ message, returnTo }) {
  const signInUrl = returnTo 
    ? `/sign-in?redirect=${encodeURIComponent(returnTo)}`
    : '/sign-in';
  
  return (
    <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Wymagane logowanie</h2>
      <p className="text-gray-600 mb-6">
        {message || 'Aby kontynuować, musisz się zalogować lub utworzyć konto.'}
      </p>
      <div className="space-y-4">
        <Link
          href={signInUrl}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Zaloguj się
        </Link>
        <Link
          href={`/sign-up${returnTo ? `?redirect=${encodeURIComponent(returnTo)}` : ''}`}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Utwórz konto
        </Link>
      </div>
    </div>
  );
}