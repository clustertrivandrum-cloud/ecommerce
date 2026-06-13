import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function run() {
  const start = Date.now();
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      title,
      slug,
      is_free_delivery,
      material,
      collection,
      rating,
      review_count,
      brand,
      product_variants (
        id, title, sku, price, stock, allow_preorder, sellable_status, is_default, option_signature,
        variant_option_values (
          product_option_values ( id, value, product_options ( id, name ) )
        )
      ),
      product_media ( media_url, position ),
      categories ( id, slug, parent_id )
    `)
    .eq('status', 'active')
    .limit(50);
  
  console.log('Query took:', Date.now() - start, 'ms');
  console.log('Got', data?.length, 'products');
  if (error) console.error(error);
}
run()
