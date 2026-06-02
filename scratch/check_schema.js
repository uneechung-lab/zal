import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jbteuyoazgrjzxhlbmml.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGV1eW9hemdyanp4aGxibW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwMzgsImV4cCI6MjA5MTAzNjAzOH0.9OSDG4y4cFii5Ry-VLmDClbJJLqYxFFPwwfHILe2Nmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('annual_leaves').select('*').limit(1);
  console.log("annual_leaves error:", error);
  console.log("annual_leaves data:", data);

  const { data: data2, error: error2 } = await supabase.from('leaves').select('*').limit(1);
  console.log("leaves error:", error2);
  console.log("leaves data:", data2);
}
test();
