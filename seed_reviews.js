require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sampleReviews = [
  { rating: 5, comment: "Absolutely love it! The quality is amazing and it looks just like the pictures." },
  { rating: 5, comment: "Beautiful piece. I've received so many compliments when wearing it." },
  { rating: 4, comment: "Really nice design, very comfortable to wear all day." },
  { rating: 5, comment: "Exceeded my expectations. Delivery was prompt and packaging was secure." },
  { rating: 4, comment: "Good value for the price. The finish is very shiny." },
  { rating: 5, comment: "Stunning craftsmanship. I'll definitely be buying more from this collection." },
  { rating: 5, comment: "Perfect gift for my sister! She wears it every day." },
  { rating: 4, comment: "Very pretty, though slightly smaller than I anticipated. Still love it." },
  { rating: 5, comment: "Bought this for a wedding and it matched my outfit perfectly!" },
  { rating: 5, comment: "Highly recommend! Fast shipping and excellent customer service." },
  { rating: 5, comment: "So elegant and delicate. Just what I was looking for." },
  { rating: 4, comment: "Nice weight to it, doesn't feel cheap at all." }
];

function getRandomReview() {
  const review = sampleReviews[Math.floor(Math.random() * sampleReviews.length)];
  return { ...review };
}

async function run() {
  console.log("Fetching products...");
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id');
    
  if (productsError) {
    console.error("Error fetching products:", productsError);
    return;
  }
  
  if (!products || products.length === 0) {
    console.log("No products found.");
    return;
  }

  console.log(`Found ${products.length} products. Generating reviews...`);
  
  const allReviewsToInsert = [];
  
  for (const product of products) {
    for (let i = 0; i < 5; i++) {
        const reviewData = getRandomReview();
        allReviewsToInsert.push({
            product_id: product.id,
            customer_id: crypto.randomUUID(), // fake customer id
            rating: reviewData.rating,
            comment: reviewData.comment,
            status: 'approved', // make sure it's public
            created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString() // random date within last ~115 days
        });
    }
  }

  console.log(`Inserting ${allReviewsToInsert.length} reviews...`);
  
  // Insert in batches of 100
  let successCount = 0;
  for (let i = 0; i < allReviewsToInsert.length; i += 100) {
      const batch = allReviewsToInsert.slice(i, i + 100);
      const { error } = await supabase.from('reviews').insert(batch);
      if (error) {
          console.error("Error inserting batch:", error);
      } else {
          successCount += batch.length;
      }
  }
  
  console.log(`Successfully inserted ${successCount} reviews!`);
}

run();
