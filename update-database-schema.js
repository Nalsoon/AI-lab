const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set REACT_APP_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateProfilesSchema() {
  console.log('🔄 Updating profiles table schema...');
  
  try {
    // Read the SQL file
    const fs = require('fs');
    const sql = fs.readFileSync('./update-profiles-schema.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Error updating schema:', error);
      
      // Try alternative approach - execute SQL directly
      console.log('🔄 Trying alternative approach...');
      
      // Create profiles table if it doesn't exist
      const { error: createError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
        
      if (createError && createError.code === 'PGRST116') {
        console.log('📝 Creating profiles table...');
        
        // We need to run this in Supabase SQL editor instead
        console.log(`
⚠️  Manual step required:

Please run the following SQL in your Supabase SQL Editor:

${sql}

Or copy the contents of update-profiles-schema.sql and run it in Supabase.
        `);
      }
    } else {
      console.log('✅ Schema updated successfully!');
    }
    
  } catch (err) {
    console.error('❌ Error:', err);
    console.log(`
⚠️  Manual step required:

Please run the following SQL in your Supabase SQL Editor:

${require('fs').readFileSync('./update-profiles-schema.sql', 'utf8')}

Or copy the contents of update-profiles-schema.sql and run it in Supabase.
    `);
  }
}

updateProfilesSchema();
