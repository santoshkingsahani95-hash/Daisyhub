import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://daisyhub.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DaisyHub (daisyhub.com) – Best Women's Clothing & Ladies Fashion Store Online in Nepal",
    template: "%s | DaisyHub Nepal",
  },
  description:
    "DaisyHub (daisyhub.com) is Nepal's premier online ladies clothing boutique. Shop exclusive women's fashion, ladies dresses, tops, trousers, co-ord sets, and trendy apparel with fast delivery across Kathmandu & all Nepal.",
  keywords: [
    'daisyhub.com',
    'daisyhubb.com',
    'daisyhub.com.np',
    'daisyhubb.com.np',
    'daisyhub',
    'daisyhubb',
    'DAISY HUB',
    'daisy hub np',
    'daisy hub nepal',
    'daisyhub online shopping nepal',
    'daisyhub ladies clothing',
    'daisyhub women fashion',
    'daisyhub clothing nepal',
    'daisyhub kathmandu',
    "women's clothing Nepal",
    "women's clothing online Nepal",
    'ladies clothing Nepal',
    'ladies clothes online Nepal',
    "women fashion Nepal",
    'ladies fashion Kathmandu',
    'buy ladies clothes Nepal',
    'ladies dresses online Nepal',
    "women's tops Nepal",
    'ladies trousers Nepal',
    'co-ord sets ladies Nepal',
    'best ladies clothing store in Kathmandu',
    'women apparel online Nepal',
    'trendy ladies clothes Nepal',
    'women online shopping Nepal',
  ],
  authors: [{ name: 'DaisyHub (daisyhub.com / daisyhubb.com)' }],
  creator: 'DaisyHub (daisyhub.com / daisyhubb.com)',
  publisher: 'DaisyHub (daisyhub.com / daisyhubb.com)',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "DaisyHub – Premium Ladies Clothing & Women's Fashion Nepal (daisyhub.com / daisyhubb.com)",
    description: "Shop exclusive ladies clothing collections online in Nepal at DaisyHub. Trendy dresses, tops, co-ords & chic fashion delivered to your doorstep.",
    url: siteUrl,
    siteName: 'DaisyHub (daisyhub.com / daisyhubb.com)',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop',
        width: 1200,
        height: 630,
        alt: 'DaisyHub Ladies Collection',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "DaisyHub – Women's Clothing Store Nepal (daisyhub.com / daisyhubb.com)",
    description: "Nepal's top online ladies clothing boutique. Discover stylish dresses, tops, co-ord sets and women's wear at DaisyHub.",
    images: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: 'DaisyHub (daisyhub.com / daisyhubb.com)',
    alternateName: ['Daisy Hub', 'DaisyHub', 'daisyhub.com', 'daisyhubb.com', 'daisyhub.com.np', 'daisyhubb.com.np', 'Daisy Hub Nepal'],
    description: "Nepal's leading online store for exclusive ladies clothing and women's fashion garments on daisyhub.com.",
    url: siteUrl,
    logo: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop',
    telephone: '+977-9800000000',
    priceRange: 'NPR 500 - NPR 10000',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Baneshwor',
      addressLocality: 'Kathmandu',
      addressRegion: 'Bagmati',
      postalCode: '44600',
      addressCountry: 'NP',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 27.7172,
      longitude: 85.324,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '09:00',
      closes: '20:00',
    },
    sameAs: [
      'https://daisyhub.com',
      'https://www.instagram.com/daisy_hubnp?stkn=MTh4dTQzeGxoMXpnYg==',
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
