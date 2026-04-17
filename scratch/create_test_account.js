
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jbteuyoazgrjzxhlbmml.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGV1eW9hemdyanp4aGxibW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwMzgsImV4cCI6MjA5MTAzNjAzOH0.9OSDG4y4cFii5Ry-VLmDClbJJLqYxFFPwwfHILe2Nmg'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createTestAccount() {
  const email = 'testuser@daumit.net'
  const password = 'password123!'
  const name = '테스트유저'

  console.log(`Creating test account: ${email}`)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name
      }
    }
  })

  if (error) {
    console.error('Sign up error:', error.message)
    return
  }

  console.log('User created successfully in Auth.')

  // Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert([
      { full_name: name, email: email }
    ])

  if (profileError) {
    console.error('Profile creation error:', profileError.message)
  } else {
    console.log('Profile created successfully.')
  }
}

createTestAccount()
