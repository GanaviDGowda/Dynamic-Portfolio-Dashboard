import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fontSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const fontMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Portfolio Dashboard — Real-time Market Analytics',
  description:
    'Dynamic multi-sector portfolio analytics with live CMP from Yahoo Finance and fundamentals from Google Finance.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontMono.variable} dark antialiased`}
    >
      <body className="min-h-full bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
        {children}
      </body>
    </html>
  );
}
