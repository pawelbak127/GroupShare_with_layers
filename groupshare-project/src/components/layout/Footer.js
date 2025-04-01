import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex justify-center md:justify-start space-x-6">
            <Link href="/" className="text-gray-500 hover:text-gray-900">
              Strona główna
            </Link>
            <Link href="/about" className="text-gray-500 hover:text-gray-900">
              O nas
            </Link>
            <Link href="/how-it-works" className="text-gray-500 hover:text-gray-900">
              Jak to działa
            </Link>
            <Link href="/contact" className="text-gray-500 hover:text-gray-900">
              Kontakt
            </Link>
          </div>
          <div className="mt-8 md:mt-0">
            <p className="text-center text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} GroupShare. Wszelkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}