
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jbteuyoazgrjzxhlbmml.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGV1eW9hemdyanp4aGxibW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjAwMzgsImV4cCI6MjA5MTAzNjAzOH0.9OSDG4y4cFii5Ry-VLmDClbJJLqYxFFPwwfHILe2Nmg'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function updateAccount() {
  const oldEmail = 'testuser@daumit.net'
  const newEmail = 'test@daumit.net'
  const newPassword = '123456'
  const newName = '정다음'

  console.log(`Creating new account: ${newEmail}`)

  // Create new user (Sign up)
  const { data, error } = await supabase.auth.signUp({
    email: newEmail,
    password: newPassword,
    options: {
      data: {
        full_name: newName
      }
    }
  })

  if (error) {
    if (error.message.includes('already registered')) {
      console.log('Account already exists. Proceeding to update name/confirm via SQL.')
    } else {
      console.error('Sign up error:', error.message)
      return
    }
  } else {
     console.log('New user created in Auth.')
  }
}

updateAccount()
