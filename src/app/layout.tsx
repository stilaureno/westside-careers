import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Westside Careers',
  description: 'Westside Resort Table Games Hiring Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}