import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jbteuyoazgrjzxhlbmml.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGV1eW9hemdyanp4aGxibW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwMzgsImV4cCI6MjA5MTAzNjAzOH0.9OSDG4y4cFii5Ry-VLmDClbJJLqYxFFPwwfHILe2Nmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const payload = {
    user_name: "__SYSTEM_ANNUAL_LEAVES__",
    store_name: "System Config",
    category: "시스템",
    status: "승인완료",
    date: "2026-05-01",
    exc_text: JSON.stringify({ "강하경": 0, "고은애": 1, "최최유민": 2 }),
    amount: 0
  };

  console.log("Inserting system settlement...");
  const { data: insertData, error: insertError } = await supabase.from('settlements').insert([payload]);
  console.log("Insert result:", insertData, insertError);

  console.log("Querying system settlements...");
  const { data: queryData, error: queryError } = await supabase
    .from('settlements')
    .select('*')
    .eq('user_name', '__SYSTEM_ANNUAL_LEAVES__')
    .order('created_at', { ascending: false });
  
  console.log("Query result count:", queryData?.length, "Error:", queryError);
  if (queryData && queryData.length > 0) {
    console.log("Latest config:", queryData[0]);
  }
}
test();
