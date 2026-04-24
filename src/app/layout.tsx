import { createClient } from '@/lib/supabase/server';
import './globals.css';

export const metadata = {
  title: 'Westside Careers',
  description: 'Westside Resort Table Games Hiring Portal',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}