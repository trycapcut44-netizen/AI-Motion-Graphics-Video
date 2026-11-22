import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import AccessGate from '@/components/AccessGate';

export const metadata: Metadata = {
  title: 'GlobalDub AI — Multilingual Video Dubbing Platform',
  description: 'AI-powered multilingual video dubbing, synchronization, and subtitle platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-slate-100 flex flex-col antialiased selection:bg-accent-500 selection:text-white">
        <AccessGate>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-border py-6 text-center text-xs text-slate-500">
            <p>© 2026 GlobalDub AI • Multilingual Video Localization Platform</p>
          </footer>
        </AccessGate>
      </body>
    </html>
  );
}
