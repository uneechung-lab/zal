import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jbteuyoazgrjzxhlbmml.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGV1eW9hemdyanp4aGxibW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwMzgsImV4cCI6MjA5MTAzNjAzOH0.9OSDG4y4cFii5Ry-VLmDClbJJLqYxFFPwwfHILe2Nmg";

async function test() {
  const payload = { test: "data", time: new Date().toISOString() };
  const body = JSON.stringify(payload);

  console.log("Uploading test file to Supabase storage...");
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/receipts/annual_leaves_test.json`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "x-upsert": "true"
    },
    body: body
  });

  console.log("Upload status:", resp.status);
  const resJson = await resp.json();
  console.log("Upload response:", resJson);

  if (resp.ok) {
    console.log("Fetching test file back...");
    const getResp = await fetch(`${SUPABASE_URL}/storage/v1/object/public/receipts/annual_leaves_test.json`);
    console.log("Fetch status:", getResp.status);
    if (getResp.ok) {
      const fetchedData = await getResp.json();
      console.log("Fetched data:", fetchedData);
    }
  }
}
test();
