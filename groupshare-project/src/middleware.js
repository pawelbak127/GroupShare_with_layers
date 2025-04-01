import { clerkMiddleware, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

// Konfiguracja middleware zabezpieczającego strony wymagające logowania
export default clerkMiddleware(req => {
  const { userId } = getAuth(req);
  const { pathname } = req.nextUrl;
  
  // Lista ścieżek publicznych, które nie wymagają logowania
  const publicPaths = [
    '/',
    '/sign-in',
    '/sign-up',
    '/offers',
    '/how-it-works',
    '/about',
    '/api/webhook'
  ];
  
  // Sprawdź, czy ścieżka jest publiczna
  const isPublicPath = publicPaths.some(path => 
    pathname === path || 
    pathname.startsWith(`${path}/`) ||
    // Obsługa dynamicznych ścieżek dla ofert
    (path === '/offers' && pathname.match(/^\/offers\/[^\/]+$/))
  );
  
  // Ścieżki chronione - wymagają logowania
  const isAuthPath = 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/applications');
  
  // Przekierowanie na stronę logowania dla chronionych ścieżek
  if (!userId && isAuthPath) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  // Generowanie nonce dla CSP
  const generateNonce = () => {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  };
  
  const nonce = generateNonce();
  
  // Konfiguracja Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' https://js.clerk.io https://js.stripe.com;
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https://secure.gravatar.com https://img.clerk.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.clerk.io https://*.supabase.co https://api.stripe.com;
    frame-src 'self' https://js.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();
  
  // Dodawanie nagłówków bezpieczeństwa
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Nonce', nonce);
  
  return response;
});

// Konfiguracja, które ścieżki powinny być ignorowane przez middleware Clerk
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|images).*)",
  ],
};