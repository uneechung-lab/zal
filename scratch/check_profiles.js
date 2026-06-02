import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jbteuyoazgrjzxhlbmml.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGV1eW9hemdyanp4aGxibW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwMzgsImV4cCI6MjA5MTAzNjAzOH0.9OSDG4y4cFii5Ry-VLmDClbJJLqYxFFPwwfHILe2Nmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log("Profiles Columns:", Object.keys(data[0] || {}));
    console.log("Sample Profile:", data[0]);
  }
}
test();
