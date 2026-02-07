import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'XDEX Alpha Scan | Token Screener',
  description: 'Real-time token screener for X1 and Solana — powered by XDEX',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-xdex-bg text-xdex-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
