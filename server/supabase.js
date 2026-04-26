require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('@supabase/supabase-js').jwtDecode;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

let supabase = null;

if (url && key && !url.includes('your-project-url')) {
  supabase = createClient(url, key);
  console.log('✓ Supabase connected');
} else {
  console.log('⚠ Supabase not configured — running without database');
}

// Verify JWT token with Supabase
async function verifyToken(token) {
  if (!supabase || !token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch (err) {
    console.error('Token verification error:', err.message);
    return null;
  }
}

module.exports = { supabase, verifyToken };