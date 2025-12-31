// Simple script to add timezone column to user_profiles
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://adyeceovkhnacaxkymih.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeWVjZW92a2huYWNheGt5bWloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk5MjIxNiwiZXhwIjoyMDgyNTY4MjE2fQ.sSkstWhg5vG28qcyw1sLjJROPhubEXn7IBu6mh6ifdI';

console.log('🔗 Connecting to Supabase...\n');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAndAddTimezone() {
  try {
    console.log('📋 Checking current user_profiles structure...\n');

    // Query to check if timezone column exists
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying user_profiles:', error);
      return;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('Current columns:', columns.join(', '));
      console.log('');

      if (columns.includes('timezone')) {
        console.log('✅ Timezone column already exists!');
        console.log(`   Current value: ${data[0].timezone || 'NULL'}`);
      } else {
        console.log('❌ Timezone column NOT found!');
        console.log('\n📝 Please run this SQL in Supabase SQL Editor:');
        console.log('\nGo to: https://supabase.com/dashboard/project/adyeceovkhnacaxkymih/sql/new');
        console.log('\nThen paste and run:\n');
        console.log('ALTER TABLE user_profiles');
        console.log("ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';");
        console.log('');
      }
    } else {
      console.log('⚠️  No users in user_profiles table yet.');
      console.log('\n📝 Still need to add timezone column. Run this SQL:');
      console.log('\nALTER TABLE user_profiles');
      console.log("ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';");
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndAddTimezone();
