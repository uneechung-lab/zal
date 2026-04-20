
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jbteuyoazgrjzxhlbmml.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
  const { data, error } = await supabase
    .from('settlements')
    .delete()
    .eq('id', '83952e81-6455-4595-8995-959ca10ea573');

  if (error) {
    console.error("Error deleting data:", error);
    return;
  }

  console.log("Successfully deleted the ghost settlement (2,000 KRW).");
}

cleanup();
