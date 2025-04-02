// src/app/about/page.jsx
export default function AboutPage() {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">O GroupShare</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Nasza misja</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-600">GroupShare powstał z misją demokratyzacji dostępu do subskrypcji cyfrowych, które stały się istotną częścią naszego codziennego życia. Wierzymy, że każdy powinien mieć możliwość korzystania z wysokiej jakości treści i usług online, nie ponosząc przy tym nadmiernych kosztów.</p>
              
              <p className="text-gray-600 mt-4">Naszym celem jest stworzenie transparentnej i bezpiecznej platformy, która łączy właścicieli niewykorzystanych miejsc w subskrypcjach rodzinnych i grupowych z osobami poszukującymi dostępu po rozsądnej cenie.</p>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Nasz zespół</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-600">Za GroupShare stoi zespół pasjonatów technologii i ekonomii współdzielenia. Łączymy doświadczenie w tworzeniu bezpiecznych aplikacji internetowych z głębokim zrozumieniem potrzeb użytkowników cyfrowych platform subskrypcyjnych.</p>
              
              <p className="text-gray-600 mt-4">Wierzymy w uczciwość, transparentność i otwartą komunikację. Jesteśmy zawsze otwarci na sugestie i pomysły naszej społeczności.</p>
            </div>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Nasza wizja</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-600">Dążymy do stworzenia wiodącej platformy do zarządzania i współdzielenia subskrypcji w Europie. Wierzymy, że przyszłość należy do modeli biznesowych, które promują zrównoważone korzystanie z zasobów i uczciwe praktyki cenowe.</p>
              
              <p className="text-gray-600 mt-4">W dłuższej perspektywie planujemy rozszerzenie platformy o nowe funkcjonalności, które ułatwią zarządzanie subskrypcjami i płatnościami, a także zbudowanie silnej społeczności użytkowników świadomie podchodzących do swoich cyfrowych wydatków.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }