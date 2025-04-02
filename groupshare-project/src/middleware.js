import { clerkMiddleware, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import { getUserByAuthId } from './lib/supabase-client';

/**
 * Rozszerzony middleware Clerk z synchronizacją Supabase
 * Zapewnia synchronizację użytkowników między Clerk i Supabase
 */
export default clerkMiddleware({
  // Funkcja rozszerzająca standardowe middleware Clerk
  async afterAuth(auth, req, evt) {
    // Pobierz bieżącą ścieżkę z URL
    const path = req.nextUrl.pathname;
    
    // Jeśli użytkownik nie jest zalogowany i próbuje uzyskać dostęp do chronionych zasobów
    if (!auth.userId && path.startsWith('/dashboard')) {
      // Przekieruj do strony logowania z powrotem do aktualnej ścieżki
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', path);
      return NextResponse.redirect(signInUrl);
    }
    
    // Jeśli ścieżka to API, pozwól na obsługę przez funkcje API
    if (path.startsWith('/api/')) {
      return NextResponse.next();
    }
    
    // Jeśli użytkownik jest zalogowany, ale nie ma jeszcze profilu w Supabase
    if (auth.userId) {
      try {
        // Sprawdź, czy użytkownik ma już profil w Supabase
        const userProfile = await getUserByAuthId(auth.userId);
        
        // Jeśli nie ma profilu, a nie jest na ścieżce API do utworzenia profilu
        if (!userProfile && !path.startsWith('/api/auth/profile')) {
          // Utwórz profil użytkownika przez API
          const profileResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/profile`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
              }
            }
          );
          
          // Jeśli tworzenie profilu się nie powiedzie, zaloguj błąd (ale pozwól użytkownikowi kontynuować)
          if (!profileResponse.ok) {
            console.error('Failed to create user profile in middleware:', await profileResponse.text());
          }
        }
      } catch (error) {
        console.error('Error syncing user profile in middleware:', error);
      }
    }
    
    // Kontynuuj standardowe przetwarzanie
    return NextResponse.next();
  },
  
  // Publiczne ścieżki, które nie wymagają uwierzytelnienia
  publicRoutes: [
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/auth/profile(.*)',
    '/api/webhook/clerk',
    '/api/webhook/stripe',
    '/api/webhook/payu',
    '/api/platforms',
    '/api/offers',
    '/api/offers/(.*)',
    '/how-it-works',
    '/about',
    '/contact',
    '/legal/(.*)',
    '/privacy-policy',
    '/terms',
    '/faq',
    '/blog',
    '/blog/(.*)'
  ],
  
  // Zabezpiecz wszystkie ścieżki admin
  protectedRoutes: [
    '/dashboard(.*)',
    '/applications(.*)',
    '/groups(.*)',
    '/profile(.*)',
    '/settings(.*)',
    '/admin(.*)',
    '/create(.*)',
    '/access(.*)'
  ],
  
  // Ignoruj pliki statyczne
  ignoredRoutes: [
    '/_next/static/(.*)',
    '/favicon.ico',
    '/images/(.*)',
    '/fonts/(.*)',
    '/api/images/(.*)',
    '/robots.txt',
    '/sitemap.xml'
  ]
});

// Konfiguracja dopasowania ścieżek
export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};