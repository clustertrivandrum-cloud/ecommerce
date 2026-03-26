import type { Metadata } from 'next';
import { getCategories } from '@/lib/api/home';
import CategoryShell from './CategoryShell';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Try to find the category name from the categories list
  let categoryName = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  try {
    const categories = await getCategories();
    const allCategories = [
      ...categories,
      ...categories.flatMap((c) => c.subcategories || []),
    ];
    const match = allCategories.find((c) => c.slug === slug);
    if (match) categoryName = match.name;
  } catch {
    // fallback to slug-derived name
  }

  const title = categoryName;
  const description = `Shop ${categoryName} jewellery & accessories at Cluster Fascination. Browse our handpicked ${categoryName} collection — shipped Pan-India.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/category/${slug}`,
    },
    openGraph: {
      title: `${categoryName} | Cluster Fascination`,
      description,
      url: `/category/${slug}`,
      type: 'website',
    },
  };
}

export default async function CategorySlugPage({ params }: PageProps) {
  const { slug } = await params;
  return <CategoryShell slug={slug} />;
}
