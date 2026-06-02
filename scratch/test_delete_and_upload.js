import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jbteuyoazgrjzxhlbmml.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGV1eW9hemdyanp4aGxibW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwMzgsImV4cCI6MjA5MTAzNjAzOH0.9OSDG4y4cFii5Ry-VLmDClbJJLqYxFFPwwfHILe2Nmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log("Removing file...");
  const { data: delData, error: delError } = await supabase.storage.from('receipts').remove(['annual_leaves_test_del.json']);
  console.log("Delete result:", delData, delError);

  console.log("Uploading file...");
  const blob = new Blob([JSON.stringify({ test: "data" })], { type: 'application/json' });
  const { data: uploadData, error: uploadError } = await supabase.storage.from('receipts').upload('annual_leaves_test_del.json', blob);
  console.log("Upload result:", uploadData, uploadError);
}
test();
