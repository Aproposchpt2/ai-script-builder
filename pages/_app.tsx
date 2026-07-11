import type { AppProps } from 'next/app';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import '../styles/globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${plusJakarta.variable} ${spaceGrotesk.variable}`}>
      <Component {...pageProps} />
    </div>
  );
}
