import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import { getUserByAuthId } from './lib/supabase-client';
import supabaseAdmin from './lib/supabase-admin-client';

// Definicja ścieżek uwierzytelniania Clerk, które powinny być obsługiwane
const clerkPublicRoutes = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/api/auth/(.*)callback',
];

// Użyj createRouteMatcher do poprawnej obsługi ścieżek Clerk
const isPublicRoute = createRouteMatcher(clerkPublicRoutes);

export default clerkMiddleware({
  async afterAuth(auth, req, evt) {
    // Pobierz bieżącą ścieżkę z URL
    const path = req.nextUrl.pathname;
    
    // Obsługa ścieżek Clerk - dodane by uniknąć 404
    if (path.includes('catchall_check') || 
        path.includes('sso-callback') || 
        isPublicRoute(path)) {
      return NextResponse.next();
    }
    
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
          console.log(`Tworzenie profilu dla użytkownika ${auth.userId} w middleware`);
          
          // Bezpośrednie utworzenie profilu przez supabaseAdmin
          try {
            // Pobierz dane uzytkownika z Clerk
            const clerkUser = auth.user;
            
            // Utwórz profil uzytkownika bezpośrednio w Supabase
            const { data: createdProfile, error: createError } = await supabaseAdmin
              .from('user_profiles')
              .insert([{
                external_auth_id: auth.userId,
                display_name: clerkUser?.firstName 
                  ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() 
                  : (clerkUser?.username || 'Nowy użytkownik'),
                email: clerkUser?.emailAddresses[0]?.emailAddress || '',
                profile_type: 'both', // Domyślna wartość
                verification_level: 'basic', // Domyślna wartość
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }])
              .select();
            
            if (createError) {
              console.error('Błąd przy tworzeniu profilu w middleware:', createError);
            } else {
              console.log('Profil użytkownika utworzony pomyślnie:', createdProfile);
            }
          } catch (profileError) {
            console.error('Wyjątek przy tworzeniu profilu użytkownika:', profileError);
          }
        }
      } catch (error) {
        console.error('Error syncing user profile in middleware:', error);
      }
    }
    
    // Kontynuuj standardowe przetwarzanie
    return NextResponse.next();
  },
  
  // Pozostała część middleware pozostaje bez zmian
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