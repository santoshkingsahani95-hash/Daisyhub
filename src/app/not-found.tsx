import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center p-6">
      <h1 className="font-serif-title text-6xl font-bold text-brand-dark mb-4">404</h1>
      <h2 className="text-xl font-bold text-brand-dark mb-2">Page Not Found</h2>
      <p className="text-sm text-brand-muted mb-6">The page you are looking for does not exist or has been moved.</p>
      <Link href="/" className="px-6 py-3 bg-brand-dark text-white text-xs font-bold uppercase tracking-wider rounded">
        Return to Home
      </Link>
    </div>
  );
}
