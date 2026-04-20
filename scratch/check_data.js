import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://jbteuyoazgrjzxhlbmml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGV1eW9hemdyanp4aGxibW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwMzgsImV4cCI6MjA5MTAzNjAzOH0.9OSDG4y4cFii5Ry-VLmDClbJJLqYxFFPwwfHILe2Nmg')

async function check() {
  console.log('Checking Profiles...')
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*')
  if (pError) console.error(pError)
  else console.log('Profiles:', profiles.map(p => ({ name: p.full_name || p.name, dept: p.department })))

  console.log('\nChecking Settlements...')
  const { data: settlements, error: sError } = await supabase.from('settlements').select('user_name').limit(20)
  if (sError) console.error(sError)
  else console.log('Settlements UserNames:', Array.from(new Set(settlements.map(s => s.user_name))))
}

check()
