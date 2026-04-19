require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data: cats } = await supabase.from('categories').select('id, name, slug, image_url, banner_image_url').order('name');
  console.log("CATEGORIES:");
  console.log(cats);
}
run();
