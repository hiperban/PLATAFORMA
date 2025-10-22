import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Hiperban',
  description: 'Plataforma Hiperban',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-5xl mx-auto p-6">
          {children}
        </div>
      </body>
    </html>
  );
}
