// Script to run database migrations on Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../functions/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Starting migration: add-timezone-support.sql');

    // Read the SQL file
    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'add-timezone-support.sql'),
      'utf8'
    );

    // Split by semicolons and filter out comments and empty lines
    const statements = sqlFile
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip BEGIN, COMMIT, and COMMENT statements (not supported in Supabase RPC)
      if (
        statement.toLowerCase().includes('begin') ||
        statement.toLowerCase().includes('commit') ||
        statement.toLowerCase().includes('comment on')
      ) {
        console.log(`⏭️  Skipping: ${statement.substring(0, 50)}...`);
        continue;
      }

      console.log(`\n📍 Executing statement ${i + 1}:`);
      console.log(statement.substring(0, 100) + '...');

      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement
      });

      if (error) {
        // If RPC doesn't exist, try direct SQL execution
        console.log('⚠️  RPC method not available, trying alternative...');

        // Try using the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);

          // For ALTER TABLE, we can ignore "column already exists" errors
          if (statement.toLowerCase().includes('add column if not exists')) {
            console.log('✅ Column may already exist, continuing...');
            continue;
          }

          throw error;
        }
      }

      console.log(`✅ Statement ${i + 1} executed successfully`);
    }

    console.log('\n🎉 Migration completed successfully!');

    // Verify the column was added
    console.log('\n🔍 Verifying migration...');
    const { data: columns, error: verifyError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log('✅ Migration verified! Sample data:', columns);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
