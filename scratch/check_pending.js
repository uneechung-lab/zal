
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ivmqyofwqqshclvgejue.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error("VITE_SUPABASE_ANON_KEY is missing.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('user_name', '정윤희')
    .or('status.eq.보류,status.eq.예외요청');

  if (error) {
    console.error("Error fetching data:", error);
    return;
  }

  console.log("Current Pending Settlements for 정윤희:");
  data.forEach(s => {
    console.log(`ID: ${s.id}, Date: ${s.date}, Amount: ${s.amount}, Status: ${s.status}`);
  });
  
  if (data.length === 0) {
    console.log("No pending settlements found in DB for 정윤희.");
  }
}

check();
