# GroupShare - Zarządzanie subskrypcjami grupowymi

GroupShare to platforma umożliwiająca łatwe i bezpieczne zarządzanie wspólnymi subskrypcjami cyfrowymi. Pozwala grupom - współlokatorom, rodzinom i małym zespołom - na sprawiedliwy podział kosztów, przejrzyste zarządzanie dostępem i bezpieczne udostępnianie subskrypcji.

## 🌟 Wizja projektu

Naszą misją jest umożliwienie grupom łatwego i transparentnego zarządzania współdzielonymi subskrypcjami cyfrowymi, promując uczciwość, bezpieczeństwo i zgodność z warunkami korzystania z usług.

## 🚀 Główne funkcjonalności

- **Zarządzanie subskrypcjami grupowymi** - jeden przejrzysty panel do zarządzania wszystkimi subskrypcjami
- **Bezpieczne udostępnianie dostępu** - bezpieczny system udostępniania bez konieczności dzielenia się hasłami
- **Sprawiedliwy podział kosztów** - automatyczne rozliczenia między członkami grupy
- **Transparentność i kontrola** - pełna widoczność kosztów i dostępów dla administratorów
- **Natychmiastowe płatności** - obsługa płatności BLIK i innych metod dla szybkiego dostępu
- **System natychmiastowego dostępu** - automatyczne udostępnianie instrukcji po zatwierdzeniu płatności

## 🏗️ Technologie

- **Frontend**: Next.js (React), TypeScript, Tailwind CSS
- **Backend**: Serverless API (Next.js API Routes)
- **Baza danych**: Supabase (PostgreSQL)
- **Autentykacja**: Clerk.dev
- **Płatności**: PayU (BLIK) + Stripe
- **Hosting**: Vercel

## 📂 Struktura repozytorium

```
groupshare-project/
├── docs/                                # Dokumentacja
│   ├── business/                        # Dokumentacja biznesowa
│   ├── branding/                        # Materiały brandingowe
│   ├── ux/                              # Dokumentacja UX
│   ├── ui/                              # Design UI
│   ├── architecture/                    # Architektura systemu
│   ├── project-management/              # Zarządzanie projektem
│   └── confidential/                    # Dokumenty poufne (tymczasowo)
│
├── src/                                 # Kod źródłowy aplikacji
│   ├── app/                             # Next.js App Router
│   ├── components/                      # Komponenty React
│   ├── lib/                             # Biblioteki i narzędzia
│   └── styles/                          # Style
│
└── README.md                            # Ten plik
```

## 🛠️ Środowisko deweloperskie

### Wymagania wstępne

- Node.js (v16.x lub nowszy)
- npm lub yarn
- Konto Supabase
- Konto Clerk.dev
- Konto Vercel (opcjonalnie)

### Uruchomienie projektu lokalnie

```bash
# Klonowanie repozytorium
git clone https://github.com/username/groupshare-project.git
cd groupshare-project

# Instalacja zależności
npm install

# Konfiguracja zmiennych środowiskowych
cp .env.example .env.local
# Edytuj .env.local i dodaj swoje klucze API

# Uruchomienie serwera deweloperskiego
npm run dev
```

## 👥 Współpraca nad projektem

Projekt jest w fazie rozwoju. Aktualnie pracujemy nad pierwszą wersją MVP.

### Zasady kontrybucji

1. Forkuj repozytorium
2. Utwórz branch dla swojej funkcjonalności (`git checkout -b feature/amazing-feature`)
3. Commituj zmiany (`git commit -m 'Add some amazing feature'`)
4. Pushuj do brancha (`git push origin feature/amazing-feature`)
5. Otwórz Pull Request

### Styl kodu

- Używamy ESLint i Prettier dla spójnego stylu kodu
- Testy jednostkowe dla komponentów i funkcji
- Komentarze dla złożonej logiki

## 📋 Harmonogram projektu

Aktualnie pracujemy nad MVP, który planujemy wypuścić w ciągu najbliższych 3 miesięcy.

1. **Faza 1 (Kwiecień 2025)**: Planowanie i design
2. **Faza 2 (Maj 2025)**: Rozwój podstawowych funkcjonalności
3. **Faza 3 (Czerwiec 2025)**: Testy i optymalizacja
4. **Faza 4 (Lipiec 2025)**: Launch MVP

Szczegółowy harmonogram znajduje się w [docs/project-management/project-timeline.md](docs/project-management/project-timeline.md).

## 📄 Licencja

Ten projekt jest prywatny i nie jest dostępny na licencji open source.

## 📞 Kontakt

W przypadku pytań dotyczących projektu, skontaktuj się z zespołem: JAKIŚ ADRES
