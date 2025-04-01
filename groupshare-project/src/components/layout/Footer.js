export default function Footer() {
    return (
      <footer className="mt-auto py-4">
        <div className="container mx-auto text-center">
          <p>© {new Date().getFullYear()} GroupShare. Wszelkie prawa zastrzeżone.</p>
        </div>
      </footer>
    );
  }