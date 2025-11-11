/**
 * Debug script to check patient facility associations
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugPatients() {
  console.log('🔍 Checking patient facility associations...\n');

  const { data: patients, error } = await supabase
    .from('patients')
    .select(`
      id,
      first_name,
      last_name,
      mrn,
      facility_id,
      facility:facilities(id, name)
    `)
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${patients.length} active patients:\n`);
  
  const patientsWithoutFacility = patients.filter(p => !p.facility_id);
  const patientsWithFacility = patients.filter(p => p.facility_id);

  console.log('✅ Patients WITH facility:');
  console.table(patientsWithFacility.map(p => ({
    Name: `${p.first_name} ${p.last_name}`,
    MRN: p.mrn,
    Facility: p.facility?.name || 'NULL'
  })));

  if (patientsWithoutFacility.length > 0) {
    console.log('\n⚠️  Patients WITHOUT facility:');
    console.table(patientsWithoutFacility.map(p => ({
      ID: p.id.substring(0, 8) + '...',
      Name: `${p.first_name} ${p.last_name}`,
      MRN: p.mrn,
      'Facility ID': 'NULL'
    })));

    console.log('\n📝 To fix, you need to assign these patients to facilities.');
    console.log('Get a facility ID by running:');
    console.log('SELECT id, name FROM facilities LIMIT 5;');
    console.log('\nThen update patients:');
    console.log('UPDATE patients SET facility_id = \'<facility-id>\' WHERE id = \'<patient-id>\';');
  }
}

debugPatients();
