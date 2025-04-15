import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import { getUserByAuthId, createUserProfile } from './lib/database/supabase-client';
import supabaseAdmin, { logAdminActivity } from './lib/database/supabase-admin-client';

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
        console.log(`Sprawdzanie profilu dla użytkownika ${auth.userId} w middleware`);
        
        // Sprawdź, czy użytkownik ma już profil w Supabase używając klienta administratora
        const { data: userProfile, error } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('external_auth_id', auth.userId)
          .single();
        
        // Jeśli wystąpił błąd inny niż "nie znaleziono rekordu"
        if (error && error.code !== 'PGRST116') {
          console.error('Błąd podczas sprawdzania profilu użytkownika:', error);
        }
        
        // Jeśli nie ma profilu, utwórz go
        if ((!userProfile || error?.code === 'PGRST116') && !path.startsWith('/api/auth/profile')) {
          console.log(`Tworzenie profilu dla użytkownika ${auth.userId} w middleware`);
          
          // Pobierz dane użytkownika z Clerk
          const clerkUser = auth.user;
          
          if (!clerkUser) {
            console.error('Brak danych użytkownika Clerk w middleware');
            return NextResponse.next();
          }
          
          // Dane do utworzenia profilu
          const profileData = {
            external_auth_id: auth.userId,
            display_name: clerkUser.firstName 
              ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() 
              : (clerkUser.username || 'Nowy użytkownik'),
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            profile_type: 'both', // Domyślna wartość
            verification_level: 'basic', // Domyślna wartość
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Utwórz profil użytkownika bezpośrednio w Supabase z klientem administratora
          const { data: createdProfile, error: createError } = await supabaseAdmin
            .from('user_profiles')
            .insert([profileData])
            .select();
          
          if (createError) {
            console.error('Błąd przy tworzeniu profilu w middleware:', createError);
            
            // Sprawdź, czy profil już istnieje
            if (createError.code === '23505') { // Violation of unique constraint
              console.log('Profil już istnieje, próba pobrania istniejącego profilu');
              
              // Pobierz istniejący profil
              const { data: existingProfile, error: fetchError } = await supabaseAdmin
                .from('user_profiles')
                .select('*')
                .eq('external_auth_id', auth.userId)
                .single();
              
              if (fetchError) {
                console.error('Błąd pobierania istniejącego profilu:', fetchError);
              } else {
                console.log('Znaleziono istniejący profil:', existingProfile?.id);
                
                // Zaloguj aktywność
                await logAdminActivity(
                  'user_profile_checked', 
                  'user_profile', 
                  existingProfile.id, 
                  { message: 'Profil już istnieje' }
                );
              }
            }
          } else {
            console.log('Profil użytkownika utworzony pomyślnie:', createdProfile[0]?.id);
            
            // Zaloguj aktywność
            await logAdminActivity(
              'user_profile_created', 
              'user_profile', 
              createdProfile[0]?.id, 
              { clerkId: auth.userId }
            );
          }
        } else if (userProfile) {
          console.log('Znaleziono istniejący profil:', userProfile.id);
        }
      } catch (error) {
        console.error('Wyjątek w middleware:', error);
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