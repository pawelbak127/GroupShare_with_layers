// src/app/how-it-works/page.jsx
export default function HowItWorksPage() {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Jak działa GroupShare?</h1>
        
        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Dla właścicieli subskrypcji</h2>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-medium text-gray-900 mb-2">1. Utwórz grupę</h3>
                <p className="text-gray-600">Załóż grupę dla znajomych, rodziny lub współlokatorów, z którymi chcesz dzielić subskrypcje.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-medium text-gray-900 mb-2">2. Dodaj subskrypcję</h3>
                <p className="text-gray-600">Wybierz platformę, ustaw cenę za miejsce i opcjonalnie włącz natychmiastowy dostęp, dodając zaszyfrowane dane dostępowe.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-medium text-gray-900 mb-2">3. Zarabiaj na wolnych miejscach</h3>
                <p className="text-gray-600">Zatwierdzaj aplikacje od zainteresowanych użytkowników i zarabiaj na niewykorzystanych miejscach w subskrypcji.</p>
              </div>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Dla szukających dostępu</h2>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-medium text-gray-900 mb-2">1. Przeglądaj oferty</h3>
                <p className="text-gray-600">Znajdź idealną subskrypcję, przeglądając oferty dostępne na platformie.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-medium text-gray-900 mb-2">2. Aplikuj o dostęp</h3>
                <p className="text-gray-600">Wyślij aplikację do wybranej oferty i poczekaj na zatwierdzenie przez właściciela.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-medium text-gray-900 mb-2">3. Zapłać i korzystaj</h3>
                <p className="text-gray-600">Po zatwierdzeniu aplikacji, dokonaj płatności i uzyskaj dostęp do subskrypcji po znacznie niższej cenie.</p>
              </div>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Bezpieczeństwo</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-600">GroupShare dba o bezpieczeństwo danych dostępowych. Wszystkie instrukcje dostępu są szyfrowane i udostępniane tylko zatwierdzonym użytkownikom po dokonaniu płatności.</p>
              <p className="text-gray-600 mt-2">System ocen i weryfikacji użytkowników pomaga budować zaufanie w społeczności.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }