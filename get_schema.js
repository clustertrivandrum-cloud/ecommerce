require('dotenv').config({ path: '.env' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const res = await fetch(url);
  const json = await res.json();
  const reviewsSchema = json.definitions.reviews;
  console.log("REVIEWS SCHEMA:", JSON.stringify(reviewsSchema, null, 2));

  // Also verify products table structure
  const productsSchema = json.definitions.products;
  console.log("PRODUCTS SCHEMA PK:", JSON.stringify(productsSchema?.properties?.id));
}
run();
