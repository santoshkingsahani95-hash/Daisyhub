import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://daisyhubb.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ace Garment – Best Women's Garment & Ladies Clothing Store Online in Nepal | Daisy Hub",
    template: "%s | Ace Garment – Ladies Fashion Nepal",
  },
  description:
    "Ace Garment (Daisy Hub) is Nepal's premier online ladies garment boutique. Shop exclusive women's fashion, ladies dresses, tops, trousers, co-ord sets, and trendy apparel with fast delivery across Kathmandu & all Nepal.",
  keywords: [
    'Ace Garment',
    'Ace Garment Nepal',
    'Ace Garment Kathmandu',
    'Ace Garment ladies wear',
    'garment',
    'garment shop Nepal',
    'garment store Kathmandu',
    'ladies garment Nepal',
    'women garment online Nepal',
    'garment online shopping Nepal',
    'best garment shop in Kathmandu',
    'ladies clothing Nepal',
    "women's clothing online Nepal",
    'ladies clothes online Nepal',
    "women fashion Nepal",
    'ladies fashion Kathmandu',
    'buy ladies clothes Nepal',
    'ladies dresses online Nepal',
    "women's tops Nepal",
    'ladies trousers Nepal',
    'co-ord sets ladies Nepal',
    'DAISY HUB',
    'daisy hub np',
    'daisyhubb',
  ],
  authors: [{ name: 'Ace Garment - Daisy Hub' }],
  creator: 'Ace Garment - Daisy Hub',
  publisher: 'Ace Garment - Daisy Hub',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Ace Garment – Premium Ladies Clothing & Women's Fashion Nepal",
    description: "Shop exclusive ladies garment collections online in Nepal. Trendy dresses, tops, co-ords & chic fashion delivered to your doorstep.",
    url: siteUrl,
    siteName: 'Ace Garment - Daisy Hub',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop',
        width: 1200,
        height: 630,
        alt: 'Ace Garment Ladies Collection',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Ace Garment – Ladies Clothing Store Nepal",
    description: "Nepal's top online ladies garment boutique. Discover stylish dresses, tops, co-ord sets and ladies wear.",
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
    name: 'Ace Garment - Daisy Hub',
    alternateName: ['Ace Garments', 'Daisy Hub', 'Ace Garment Nepal'],
    description: "Nepal's leading online store for exclusive ladies clothing and women's fashion garments.",
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
