import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jbteuyoazgrjzxhlbmml.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGV1eW9hemdyanp4aGxibW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwMzgsImV4cCI6MjA5MTAzNjAzOH0.9OSDG4y4cFii5Ry-VLmDClbJJLqYxFFPwwfHILe2Nmg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function validate(d, allowed) {
  const issues = [];
  const catMatch = allowed.some(t => {
    // 상점명 매칭
    const actualStore = (d.store_name || d.storeName || d.store || d.desc || "").trim();
    if (actualStore && t.trim() && (actualStore.includes(t.trim()) || t.trim().includes(actualStore))) {
      return true;
    }
    // 카테고리 매칭
    const cStr = (d.category || "").split(/[\/,·\s]/);
    return cStr.some(c => c.trim() && (c.trim().includes(t) || t.includes(c.trim())));
  });
  if (!catMatch) issues.push("지원 업종이 아닙니다. (업종: " + (d.category || "미확인") + ")");
  return { catMatch, issues };
}

async function test() {
  const { data: catData } = await supabase.from('allowed_categories').select('name');
  const { data: sub } = await supabase.from('settlements').select('*').eq('id', 'cce2bbaa-818e-4632-a36b-95a67307842f').single();
  
  const allowed = catData.map(d => d.name);
  console.log("Allowed Categories:", allowed);
  console.log("Target Settlement:", sub);
  
  const result = validate(sub, allowed);
  console.log("Validation Result:", result);
}
test();
