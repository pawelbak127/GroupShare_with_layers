/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Ustawienia bezpieczeństwa
    poweredByHeader: false, // Ukrycie nagłówka X-Powered-By
    // Nagłówki bezpieczeństwa
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            // Wymuszanie HTTPS
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload'
            },
            // Zapobieganie MIME sniffing
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff'
            },
            // Zabezpieczenie przed clickjacking
            {
              key: 'X-Frame-Options',
              value: 'SAMEORIGIN'
            },
            // Zabezpieczenie XSS
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block'
            },
            // Kontrola referrera
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin'
            },
            // Zarządzanie uprawnieniami (Permissions Policy)
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
            }
          ]
        }
      ];
    },
    // Konfiguracja obrazów
    images: {
      domains: ['secure.gravatar.com'], // Bezpieczne domeny dla obrazów
      // Dodaj inne zaufane domeny jeśli potrzebne
    },
    // Konfiguracja kompilacji i minifikacji
    swcMinify: true,
    experimental: {
      // Kompresja
      compression: true,
      // Izolacja modułów
      esmExternals: true,
    },
  };
  
  module.exports = nextConfig;