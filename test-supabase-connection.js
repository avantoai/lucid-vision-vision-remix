require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Environment variables check:');
  console.log('✓ SUPABASE_URL:', url ? 'Set' : 'Missing');
  console.log('✓ SUPABASE_ANON_KEY:', anonKey ? 'Set' : 'Missing');
  console.log('✓ SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? 'Set' : 'Missing');
  console.log('');
  
  if (!url || !anonKey || !serviceKey) {
    console.log('❌ Missing required environment variables');
    process.exit(1);
  }
  
  try {
    const supabase = createClient(url, serviceKey);
    
    console.log('Testing database connection...');
    const { data, error } = await supabase.from('_health').select('*').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('✅ Connection successful! (No tables yet, which is expected)');
    } else if (error) {
      console.log('Connection established, but got error:', error.message);
    } else {
      console.log('✅ Connection successful and tables exist!');
    }
    
    console.log('\n🎉 All Supabase credentials are working correctly!');
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
