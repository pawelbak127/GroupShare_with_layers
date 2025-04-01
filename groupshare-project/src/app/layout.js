// src/app/layout.js
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'react-hot-toast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './globals.css';

// Load Inter font
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

// Metadata for the application
export const metadata = {
  title: 'GroupShare - Zarządzanie subskrypcjami grupowymi',
  description: 'Platforma do zarządzania i współdzielenia subskrypcji grupowych. Dziel koszty, zarządzaj dostępem, oszczędzaj.',
  keywords: 'subskrypcje, współdzielenie, oszczędności, zarządzanie, grupa',
};

/**
 * Root layout wrapper for the entire application
 */
export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="pl" className={`${inter.variable} h-full`}>
        <body className="h-full bg-gray-50 flex flex-col">
          {/* Toast notifications */}
          <Toaster position="top-right" />
          
          {/* Header */}
          <Header />
          
          {/* Main content */}
          <main className="flex-grow">
            {children}
          </main>
          
          {/* Footer */}
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}