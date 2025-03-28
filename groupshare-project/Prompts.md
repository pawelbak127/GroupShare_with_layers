# Prompty dla poszczególnych etapów ulepszonego planu

## Etap 1: Planowanie i definicja modelu biznesowego

```
Pracuję nad aplikacją GroupShare (dawniej FamilyShare), która ułatwia dzielenie się subskrypcjami grupowymi. Przeobrażam model biznesowy, aby zminimalizować ryzyko prawne i zapewnić zgodność z warunkami korzystania serwisów streamingowych/subskrypcyjnych.

Pomóż mi przygotować:

1. Analizę warunków korzystania z usług najpopularniejszych platform subskrypcyjnych pod kątem:
   - Definicji "gospodarstwa domowego" / "rodziny" / "grupy"
   - Dopuszczalności dzielenia kont
   - Wymagań geograficznych (ten sam adres, region, kraj)
   - Konsekwencji naruszenia warunków

2. Nową strategię pozycjonowania platformy:
   - Przesunięcie z "dzielenia kont rodzinnych między obcymi osobami" na "narzędzie do zarządzania wspólnymi subskrypcjami dla gospodarstw domowych i grup zainteresowań"
   - Terminologię, która minimalizuje ryzyko prawne
   - Materiały edukacyjne dla użytkowników o warunkach korzystania

3. Strategię komunikacji:
   - Disclaimery prawne
   - Edukacja użytkowników
   - Rankingi ryzyka dla różnych platform

4. Listę platform docelowych z priorytetyzacją tych o najniższym ryzyku prawnym

Potrzebuję konkretnych propozycji, które pomogą zminimalizować ryzyko prawne, ale jednocześnie zachować atrakcyjność biznesową platformy.
```

## Etap 2: Architektura i model danych z uwzględnieniem bezpieczeństwa

```
Pracuję nad aplikacją GroupShare w Next.js, Supabase i Clerk.dev. Potrzebuję zaprojektować architekturę i model danych z naciskiem na bezpieczeństwo, szczególnie dla wrażliwych danych dostępowych.

Pomóż mi stworzyć:

1. Model danych z uwzględnieniem:
   - Szyfrowania asymetrycznego dla instrukcji dostępowych
   - Minimalizacji przechowywanych danych osobowych
   - Rozdzielenia danych wrażliwych i niewrażliwych
   - Modelu uprawnień z wykorzystaniem Row Level Security Supabase

2. Architekturę bezpiecznego systemu natychmiastowego dostępu:
   - System generowania i zarządzania kluczami szyfrowania
   - Mechanizm jednorazowych, wygasających linków do instrukcji
   - Monitoring wykorzystania dostępu
   - Zabezpieczenia przed nieautoryzowanym dostępem

3. Schemat przepływu danych w kluczowych procesach:
   - Proces tworzenia oferty z instrukcjami dostępowymi
   - Proces natychmiastowego udostępniania po płatności
   - System monitorowania i potwierdzania dostępu

4. Plan implementacji zabezpieczeń:
   - Szyfrowanie w spoczynku i podczas transmisji
   - Zarządzanie kluczami szyfrującymi
   - Mechanizmy zapobiegające wyciekom danych
   - Audyt dostępu do wrażliwych danych

Rozwiązania powinny być bezpieczne, ale jednocześnie implementowalne przez jednego dewelopera z pomocą Claude.AI.
```

## Etap 3: Konfiguracja infrastruktury i środowiska

```
Rozpoczynam implementację aplikacji GroupShare (Next.js, Supabase, Clerk.dev). Potrzebuję skonfigurować infrastrukturę i środowisko deweloperskie z uwzględnieniem bezpieczeństwa i optymalizacji kosztów.

Pomóż mi z:

1. Konfiguracją projektu Next.js:
   - Setup Next.js z App Router
   - Konfiguracja Tailwind CSS
   - Struktura projektu uwzględniająca moduły bezpieczeństwa
   - Konfiguracja zmiennych środowiskowych i zabezpieczeń

2. Konfiguracją Supabase:
   - Struktura bazy danych
   - Row Level Security
   - Polityki bezpieczeństwa
   - Konfiguracja kryptograficzna dla danych wrażliwych

3. Konfiguracją CI/CD:
   - Github Actions dla prostego pipline'u
   - Automatyczne testy bezpieczeństwa
   - Deployment na Vercel/Netlify

4. Optymalizacją warstw darmowych:
   - Strategia wykorzystania darmowych planów bez przekraczania limitów
   - Przygotowanie do skalowania
   - Monitoring zużycia zasobów

Potrzebuję konkretnego kodu konfiguracyjnego i instrukcji wdrożeniowych, które mogę bezpośrednio wykorzystać jako pojedynczy deweloper.
```

## Etap 4: System autentykacji i profile użytkowników

```
Pracuję nad aplikacją GroupShare w Next.js. Mam już skonfigurowane środowisko. Teraz potrzebuję zaimplementować system autentykacji i profile użytkowników z zaawansowanym systemem reputacji.

Pomóż mi stworzyć:

1. Integrację Clerk.dev z Next.js App Router:
   - Konfiguracja middleware
   - Komponenty autentykacji (sign-up, sign-in, oauth)
   - Bezpieczne zarządzanie sesją
   - Integracja z Supabase

2. System profili użytkowników:
   - Model danych profilu (minimalna ilość danych osobowych)
   - Formularze uzupełniania profilu po rejestracji
   - Rozróżnienie ról (sprzedający/kupujący)
   - Panel zarządzania profilem

3. System reputacji i weryfikacji:
   - Wielopoziomowy system weryfikacji tożsamości
   - System ocen z wieloma kryteriami
   - Odznaki i statusy użytkowników (np. "Zweryfikowany", "Zaufany")
   - Algorytm wyliczania reputacji

4. Zabezpieczenia:
   - Walidacja danych wejściowych
   - Ochrona przed nadużyciami (rate limiting, wykrywanie podejrzanych zachowań)
   - Przejrzyste informacje o używanych danych

Potrzebuję kompletnego kodu z komentarzami, który będzie solidny, ale jednocześnie prosty do implementacji przez jednego dewelopera.
```

## Etap 5: Główne funkcjonalności

```
Rozwijam aplikację GroupShare w Next.js. Mam już zaimplementowany system autentykacji i profile użytkowników. Teraz potrzebuję stworzyć główne funkcjonalności aplikacji.

Pomóż mi zaimplementować:

1. System ofert subskrypcji:
   - Formularze tworzenia/edycji ofert
   - Opcja włączania natychmiastowego dostępu
   - Bezpieczne wprowadzanie i przechowywanie instrukcji dostępowych
   - Walidacja ofert

2. System wyszukiwania i filtrowania:
   - Komponenty wyszukiwania z filtrami (platforma, cena, oceny, natychmiastowy dostęp)
   - Sortowanie wyników
   - Optymalizowane zapytania do bazy danych
   - Przyjazny interfejs użytkownika

3. System aplikowania o dostęp:
   - Proces aplikowania z uwzględnieniem typu oferty
   - Zarządzanie aplikacjami (dla sprzedających)
   - Śledzenie statusu aplikacji (dla kupujących)
   - Obsługa różnych statusów aplikacji

4. System komunikacji:
   - Wewnętrzny czat między użytkownikami
   - Szablony wiadomości
   - Powiadomienia o ważnych zdarzeniach
   - Zabezpieczenia przed nadużyciami

Kod powinien być modularny, dobrze zorganizowany i łatwy do utrzymania. Zadbaj o odpowiednie zabezpieczenia, szczególnie w kontekście przechowywania danych ofert i komunikacji.
```

## Etap 6: Ulepszona implementacja natychmiastowego dostępu

```
Rozwijam aplikację GroupShare w Next.js i Supabase. Potrzebuję zaimplementować ulepszony, bezpieczny system natychmiastowego dostępu do subskrypcji po dokonaniu płatności.

Pomóż mi stworzyć:

1. System szyfrowania asymetrycznego dla instrukcji dostępowych:
   - Generowanie i zarządzanie parami kluczy
   - Bezpieczne szyfrowanie instrukcji wprowadzanych przez sprzedających
   - Deszyfrowanie tylko w momencie udostępnienia
   - Zabezpieczenie kluczy prywatnych

2. Mechanizm jednorazowych, wygasających linków:
   - Generowanie unikalnych, jednorazowych tokenów
   - System wygasania linków (czasowy, po użyciu)
   - Zabezpieczenia przed wielokrotnym dostępem
   - Walidacja autentyczności linków

3. Interfejs użytkownika dla natychmiastowego dostępu:
   - Bezpieczny widok instrukcji (jednorazowy, z czasem wygaśnięcia)
   - System potwierdzania otrzymania działającego dostępu
   - UI informujący o jednorazowości dostępu
   - Opcje kopiowania/zapisu instrukcji

4. System monitorowania skuteczności dostępu:
   - Mechanizm "check-in" dla potwierdzenia działającego dostępu
   - Automatyczne przypomnienia o potwierdzeniu
   - Obsługa zgłaszania problemów z dostępem
   - Dashboard dla sprzedających z statusem dostępów

Potrzebuję kompletnej implementacji z naciskiem na bezpieczeństwo, a jednocześnie zachowanie prostoty korzystania dla użytkowników końcowych.
```

## Etap 7: System płatności i escrow z integracją BLIK

```
Pracuję nad aplikacją GroupShare w Next.js i potrzebuję zaimplementować bezpieczny system płatności z funkcją escrow, zintegrowany z mechanizmem natychmiastowego dostępu. Aplikacja będzie kierowana głównie do użytkowników z Polski, dlatego kluczowa jest integracja z systemem BLIK.

Pomóż mi stworzyć:

1. System płatności z wieloma metodami:
   - Integracja z PayU dla obsługi BLIK i lokalnych metod płatności
   - Integracja ze Stripe dla międzynarodowych płatności kartami
   - Adapter płatności dla ujednoliconego interfejsu różnych bramek
   - Automatyczne wykrywanie preferencji użytkownika na podstawie lokalizacji

2. Szczegółowa implementacja BLIK:
   - Proces generowania i obsługi płatności BLIK
   - Obsługa webhooków PayU dla natychmiastowych aktualizacji
   - Synchronizacja natychmiastowych płatności BLIK z systemem instant access
   - Obsługa przypadków specyficznych dla BLIK (np. wygaśnięcie kodu)

3. System escrow (zabezpieczenia płatności):
   - Przechowywanie środków do momentu potwierdzenia dostępu
   - Automatyczne zwolnienie płatności po potwierdzeniu
   - Mechanizm automatycznych zwrotów w przypadku problemów
   - Śledzenie statusu płatności

4. System prowizji i rozliczeń:
   - Model naliczania prowizji (% od transakcji)
   - Rozliczenia dla sprzedających
   - Historia transakcji i raportowanie
   - Faktury i dokumentacja finansowa

5. UI/UX dla systemu płatności:
   - Intuicyjny wybór metody płatności z priorytetem dla BLIK dla polskich użytkowników
   - Instrukcje specificzne dla każdej metody płatności
   - Ekran potwierdzenia i statusu transakcji
   - Obsługa błędów w przystępnej formie

Rozwiązanie powinno być bezpieczne, niezawodne i zgodne z regulacjami finansowymi, ale jednocześnie możliwe do zaimplementowania przez jedną osobę.
```

## Etap 8: System monitorowania i rozwiązywania sporów

```
Pracuję nad aplikacją GroupShare i potrzebuję stworzyć system monitorowania skuteczności dostępu do subskrypcji oraz mechanizm rozwiązywania sporów między użytkownikami.

Pomóż mi zaimplementować:

1. System recenzji i ocen:
   - Wielokryterialne oceny (jakość instrukcji, szybkość, trwałość dostępu)
   - Weryfikacja autentyczności ocen (tylko po faktycznej transakcji)
   - System rekomendacji bazujący na ocenach
   - UI dla wystawiania i przeglądania ocen

2. Mechanizm rozwiązywania sporów:
   - Proces zgłaszania problemów z dostępem
   - System mediacji między użytkownikami
   - Algorytm automatycznego rozstrzygania prostych sporów
   - Panel administratora do obsługi złożonych przypadków

3. Automatyczne monitorowanie dostępu:
   - System regularnych check-inów potwierdzających aktywność dostępu
   - Automatyczne powiadomienia przy wykryciu problemów
   - Zbieranie metryk dotyczących stabilności dostępu
   - Proaktywne wykrywanie potencjalnych problemów

4. Panel wsparcia dla użytkowników:
   - Interfejs do komunikacji z obsługą platformy
   - System ticketów dla zgłoszeń
   - Baza wiedzy z najczęstszymi problemami
   - Automatyczne sugestie rozwiązań typowych problemów

Rozwiązanie powinno być sprawiedliwe, transparentne i budujące zaufanie użytkowników do platformy, przy jednoczesnym zachowaniu niskich kosztów operacyjnych.
```

## Etap 9: Optymalizacja, testowanie i bezpieczeństwo

```
Zbliżam się do końca prac nad aplikacją GroupShare (Next.js, Supabase, Clerk.dev, Stripe). Potrzebuję przeprowadzić kompleksową optymalizację, testy i audyt bezpieczeństwa.

Pomóż mi z:

1. Planem testowania aplikacji:
   - Lista kluczowych przypadków testowych dla wszystkich głównych funkcjonalności
   - Automatyzacja testów bezpieczeństwa
   - Testy wydajności i skalowalności
   - Testy edge case'ów i scenariuszy nadużyć

2. Audytem bezpieczeństwa:
   - Kompleksowy przegląd zabezpieczeń szyfrowania
   - Analiza potencjalnych podatności w API
   - Sprawdzenie bezpieczeństwa autentykacji i autoryzacji
   - Walidacja zabezpieczeń płatności i danych finansowych

3. Optymalizacją wydajności:
   - Analiza i optymalizacja zapytań do bazy danych
   - Optymalizacja renderowania front-endu
   - Strategie cachingu dla poprawy responsywności
   - Optymalizacja ładowania zasobów

4. Strategią monitoringu i reagowania:
   - Konfiguracja alertów dla krytycznych błędów
   - Systemy wykrywania nieautoryzowanego dostępu
   - Plan reagowania na incydenty bezpieczeństwa
   - Procedury backup i recovery

Potrzebuję konkretnych strategii, skryptów testowych i rekomendacji, które mogę zaimplementować jako pojedynczy deweloper, aby zapewnić bezpieczeństwo i niezawodność aplikacji przed jej pełnym wdrożeniem.
```

## Etap 10: Wdrożenie i monitoring produkcyjny

```
Zakończyłem prace deweloperskie nad aplikacją GroupShare i jestem gotowy do wdrożenia na środowisko produkcyjne. Potrzebuję pomocy z procesem wdrożenia, konfiguracją monitoringu i strategią pozyskiwania pierwszych użytkowników.

Pomóż mi z:

1. Procesem wdrożenia produkcyjnego:
   - Checklist'a przed wdrożeniem
   - Konfiguracja Vercel/Netlify dla produkcji
   - Konfiguracja domen, SSL, zmiennych środowiskowych
   - Strategie wdrażania z minimalnym przestojem

2. Systemem monitoringu:
   - Konfiguracja Sentry/LogRocket dla śledzenia błędów
   - Dashboardy monitorujące kluczowe metryki
   - Alerty dla krytycznych problemów
   - Monitoring bezpieczeństwa

3. Analityką i metrykami:
   - Implementacja Google Analytics/Plausible
   - Śledzenie kluczowych metryk biznesowych
   - Funnel konwersji i punkty drop-off
   - Dashboardy dla podejmowania decyzji

4. Strategią pozyskiwania pierwszych użytkowników:
   - Plan soft launch dla ograniczonej grupy
   - Strategie marketingowe przy niskim budżecie
   - Program poleceń dla wczesnych użytkowników
   - Plan zbierania i analizy feedbacku

Potrzebuję praktycznych wskazówek, które pozwolą mi na bezpieczne wdrożenie i skalowanie aplikacji, a także na szybkie pozyskanie pierwszych użytkowników, którzy zwalidują model biznesowy.
```

## Prompt: Implementacja kont premium i modelu monetyzacji

```
Pracuję nad aplikacją GroupShare i chcę zaimplementować zróżnicowany model monetyzacji, w tym konta premium i usługi dodatkowe, aby zdywersyfikować źródła przychodów.

Pomóż mi stworzyć:

1. System kont premium:
   - Model danych dla różnych poziomów subskrypcji
   - Funkcjonalności dostępne wyłącznie dla użytkowników premium
   - System zarządzania subskrypcjami (poprzez Stripe)
   - UI dla przedstawienia korzyści z kont premium

2. Dodatkowe usługi płatne:
   - Weryfikacja "Zaufanego Sprzedawcy"
   - Priorytetowe wyświetlanie ofert
   - Dostęp do zaawansowanych statystyk
   - Gwarancja bezpieczeństwa dla kupujących

3. Integrację płatności za usługi:
   - Modele danych dla różnych typów płatności
   - Proces zakupu usług dodatkowych
   - System rozliczeń i fakturowanie
   - Historia transakcji i zarządzanie subskrypcjami

4. Strategię cenową i testowanie konwersji:
   - Propozycje struktury cenowej dla różnych poziomów
   - A/B testy dla różnych modeli cenowych
   - Strategie promocyjne i trial
   - Metryki do śledzenia konwersji i retencji

Potrzebuję kompletnego rozwiązania, które będzie przynosiło przychody, ale jednocześnie zachowa równowagę między funkcjonalnościami płatnymi a darmowymi, aby nie zniechęcać nowych użytkowników.
```

## Prompt: Implementacja bezpiecznego systemu szyfrowania asymetrycznego

```
W aplikacji GroupShare potrzebuję zaimplementować zaawansowany system szyfrowania asymetrycznego dla instrukcji dostępowych do subskrypcji, który będzie jednocześnie bezpieczny i umożliwiający natychmiastowy dostęp po płatności.

Pomóż mi zaimplementować:

1. System zarządzania kluczami:
   - Generowanie par kluczy (publiczny/prywatny)
   - Bezpieczne przechowywanie kluczy prywatnych
   - Rotacja kluczy i zarządzanie wersjami
   - Zabezpieczenie przed nieautoryzowanym dostępem do kluczy

2. Proces szyfrowania instrukcji:
   - Frontend do wprowadzania instrukcji przez sprzedających
   - Szyfrowanie na froncie z użyciem klucza publicznego
   - Bezpieczne przechowywanie zaszyfrowanych danych w Supabase
   - Walidacja i weryfikacja procesu szyfrowania

3. Proces deszyfrowania i udostępniania:
   - Bezpieczny proces deszyfrowania po potwierdzeniu płatności
   - Mechanizm jednorazowych, wygasających linków do instrukcji
   - Warstwa prezentacji odszyfrowanych danych bez ich persystencji
   - Zabezpieczenia przed wielokrotnym dostępem

4. Zabezpieczenia dodatkowe:
   - Logowanie wszystkich operacji deszyfrowania
   - Wykrywanie podejrzanych wzorców dostępu
   - Mechanizmy recovery w przypadku utraty kluczy
   - Rozwiązania dla przypadków brzegowych

Potrzebuję pełnej implementacji w Next.js i Supabase, która będzie solidna kryptograficznie, ale jednocześnie możliwa do zaimplementowania i utrzymania przez jednego dewelopera. Szczególnie zależy mi na zachowaniu funkcjonalności natychmiastowego dostępu.
```
