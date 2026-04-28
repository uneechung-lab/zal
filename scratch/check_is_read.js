import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('feedbacks').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Sample Data:", data[0]);
  }
}

check();
