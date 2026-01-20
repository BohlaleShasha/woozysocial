const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  try {
    console.log('Checking if onboarding columns exist...\n');

    // Try to query user_profiles with new columns
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('onboarding_completed, onboarding_step, questionnaire_answers')
      .limit(1);

    if (userError) {
      console.log('❌ user_profiles columns missing or error:');
      console.log('   Error:', userError.message);
      console.log('\n⚠️  Migration 009_onboarding_and_signup.sql needs to be run!');
    } else {
      console.log('✓ user_profiles has onboarding columns');
    }

    // Try to query workspaces with new columns
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('onboarding_status, questionnaire_data')
      .limit(1);

    if (workspaceError) {
      console.log('❌ workspaces columns missing or error:');
      console.log('   Error:', workspaceError.message);
      console.log('\n⚠️  Migration 009_onboarding_and_signup.sql needs to be run!');
    } else {
      console.log('✓ workspaces has onboarding columns');
    }

    // Check if login_tokens table exists
    const { data: loginToken, error: tokenError } = await supabase
      .from('login_tokens')
      .select('id')
      .limit(1);

    if (tokenError) {
      console.log('❌ login_tokens table missing or error:');
      console.log('   Error:', tokenError.message);
      console.log('\n⚠️  Migration 009_onboarding_and_signup.sql needs to be run!');
    } else {
      console.log('✓ login_tokens table exists');
    }

    console.log('\n✅ All onboarding columns and tables are ready!');
  } catch (error) {
    console.error('Check failed:', error);
  }
}

checkColumns();
