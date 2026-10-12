import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';

import './globals.css';

export const metadata: Metadata = {
  title: 'Satark Cyber Cell',
  description: 'Live scam intelligence, case queue and automated victim updates for the cyber crime police.',
};

export const viewport: Viewport = { themeColor: '#121211', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        {children}
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
