// Simple script to add timezone column to user_profiles
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../functions/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addTimezoneColumn() {
  try {
    console.log('\n🚀 Adding timezone column to user_profiles table...\n');

    // Since Supabase doesn't support raw SQL via the client easily,
    // we'll use the SQL editor endpoint
    const sql = `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';`;

    console.log('SQL to execute:');
    console.log(sql);
    console.log('\n⚠️  Please run this SQL in your Supabase SQL Editor:');
    console.log('\n1. Go to: https://adyeceovkhnacaxkymih.supabase.co/project/adyeceovkhnacaxkymih/sql');
    console.log('2. Paste the SQL above');
    console.log('3. Click "Run"\n');

    console.log('📝 Alternatively, checking if we can verify existing structure...\n');

    // Try to query the table to see current structure
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying user_profiles:', error);
    } else {
      console.log('✅ Current user_profiles structure:');
      if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]).join(', '));

        if ('timezone' in data[0]) {
          console.log('\n✅ Timezone column already exists!');
        } else {
          console.log('\n❌ Timezone column NOT found. Please run the SQL above.');
        }
      } else {
        console.log('No data in user_profiles table yet.');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addTimezoneColumn();
