require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

let supabase = null;

if (url && key && !url.includes('your-project-url')) {
  supabase = createClient(url, key);
  console.log('✓ Supabase connected');
} else {
  console.log('⚠ Supabase not configured — running without database');
}

module.exports = { supabase };
