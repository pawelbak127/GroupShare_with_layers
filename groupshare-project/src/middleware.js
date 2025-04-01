import { NextResponse } from 'next/server';
import { clerkMiddleware, getAuth } from '@clerk/nextjs/server';

// Owijamy naszą funkcję middleware funkcją clerkMiddleware
export default clerkMiddleware((req) => {
  const { pathname } = req.nextUrl;
  const { userId } = getAuth(req);
  
  // Generowanie unikalnego nonce dla CSP
  const generateNonce = () => {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  };
  
  // Nonce dla CSP
  const nonce = generateNonce();
  
  // Konfiguracja Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' https://js.clerk.io https://js.stripe.com https://cdn.paddle.com;
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https://secure.gravatar.com https://img.clerk.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://api.clerk.io https://*.supabase.co https://api.stripe.com;
    frame-src 'self' https://js.stripe.com https://checkout.paddle.com;
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
  
  // Kontrola dostępu do chronionych ścieżek
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/applications')
  ) {
    if (!userId) {
      // Przekierowanie na stronę logowania dla chronionych ścieżek
      const url = new URL('/sign-in', req.url);
      url.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(url);
    }
  }
  
  return response;
});

// Konfiguracja, które ścieżki powinny uruchamiać middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api routes that handle their own authentication
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)',
  ],
};