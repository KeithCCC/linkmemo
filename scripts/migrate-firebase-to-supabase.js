// scripts/migrate-firebase-to-supabase.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://yyjplaplxpjmaetwakwp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5anBsYXBseHBqbWFldHdha3dwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk3MTg1OSwiZXhwIjoyMDc3NTQ3ODU5fQ.tkRS3yACwnSJmOENoqN4W7rMj1cTfKANl7mu0xadgr0';

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateNotes() {
  console.log('📦 Loading Firebase data...');
  
  // Read the Firebase export
  const firebaseData = JSON.parse(fs.readFileSync('asuka-notes.json', 'utf-8'));
  
  console.log(`📊 Found ${firebaseData.length} notes to migrate`);
  
  // Use the logged-in user ID
  const userId = '6c10dea5-cfe7-4e77-9e8c-a84f6335c30d';
  console.log(`👤 Migrating for user: keithc2chen@gmail.com`);
  
  // Transform and insert notes
  const transformedNotes = firebaseData.map(note => ({
    // Don't import 'id' - let Supabase generate UUIDs
    user_id: userId,
    title: note.title || 'Untitled',
    content: note.content || '',
    tags: Array.isArray(note.tags) ? note.tags : [],
    created_at: note.createdAt 
      ? new Date(typeof note.createdAt === 'number' ? note.createdAt : note.createdAt).toISOString()
      : new Date().toISOString(),
    updated_at: note.updatedAt
      ? new Date(typeof note.updatedAt === 'number' ? note.updatedAt : note.updatedAt).toISOString()
      : new Date().toISOString()
  }));
  
  console.log('🔄 Inserting notes into Supabase...');
  
  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  let failed = 0;
  
  for (let i = 0; i < transformedNotes.length; i += batchSize) {
    const batch = transformedNotes.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('notes')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
      failed += batch.length;
    } else {
      inserted += data.length;
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${data.length} notes inserted`);
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`✅ Successfully migrated: ${inserted} notes`);
  console.log(`❌ Failed: ${failed} notes`);
  console.log('\n🎉 Migration complete!');
}

migrateNotes().catch(console.error);
