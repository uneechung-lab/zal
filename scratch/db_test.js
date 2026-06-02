import { createClient } from "@supabase/supabase-js";

const url = "https://jbteuyoazgrjzxhlbmml.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGV1eW9hemdyanp4aGxibW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwMzgsImV4cCI6MjA5MTAzNjAzOH0.9OSDG4y4cFii5Ry-VLmDClbJJLqYxFFPwwfHILe2Nmg";

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('allowed_categories').select('*').limit(5);
  if (error) {
    console.error("Error fetching categories:", error);
  } else {
    console.log("Allowed Categories structure:", data);
  }
}

run();
