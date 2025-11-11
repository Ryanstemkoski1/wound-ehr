require('dotenv').config({ path: '.env.local' });
const pg = require('pg');

// PostgreSQL connection string from Supabase
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL or SUPABASE_DB_URL not found in .env.local');
  console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
  console.log('---');
  const fs = require('fs');
  console.log(fs.readFileSync('supabase/migrations/00006_update_visit_status_enum.sql', 'utf8'));
  process.exit(1);
}

async function runMigration() {
  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log('Running migration 00006_update_visit_status_enum.sql...\n');

    // Drop old constraint
    await client.query('ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check');
    console.log('✅ Dropped old constraint');

    // Add new constraint
    await client.query(`
      ALTER TABLE visits ADD CONSTRAINT visits_status_check 
      CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled', 'no-show', 'incomplete', 'complete'))
    `);
    console.log('✅ Added new constraint with expanded statuses');

    // Update existing values
    const { rowCount: incomplete } = await client.query(`
      UPDATE visits SET status = 'scheduled' WHERE status = 'incomplete'
    `);
    console.log(`✅ Updated ${incomplete} rows from 'incomplete' to 'scheduled'`);

    const { rowCount: complete } = await client.query(`
      UPDATE visits SET status = 'completed' WHERE status = 'complete'
    `);
    console.log(`✅ Updated ${complete} rows from 'complete' to 'completed'`);

    // Set new default
    await client.query(`ALTER TABLE visits ALTER COLUMN status SET DEFAULT 'scheduled'`);
    console.log('✅ Set default status to \'scheduled\'');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
    console.log('---');
    const fs = require('fs');
    console.log(fs.readFileSync('supabase/migrations/00006_update_visit_status_enum.sql', 'utf8'));
  } finally {
    await client.end();
  }
}

runMigration();
