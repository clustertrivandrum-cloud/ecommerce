import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'All Products',
  description:
    'Browse the full Cluster Fascination collection — fashion jewellery and accessories for every occasion. Filter by category, price, and size.',
  alternates: {
    canonical: '/products',
  },
  openGraph: {
    title: 'All Products | Cluster Fascination',
    description:
      'Browse the full Cluster Fascination collection — fashion jewellery and accessories for every occasion.',
    url: '/products',
    type: 'website',
  },
};

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
