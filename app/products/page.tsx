
import { getProducts } from '@/lib/api/product';
import { getCategories } from '@/lib/api/home';
import { ProductsClient } from './ProductsClient';

export const dynamic = 'force-dynamic';

export default async function AllProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return <ProductsClient initialProducts={products} initialCategories={categories} />;
}
