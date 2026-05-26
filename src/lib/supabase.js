import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase
if (!supabaseUrl || !supabaseKey) {
  // Avoid throwing during module evaluation when env vars are missing.
  // Log a clear warning and export a minimal stub to keep the app running in dev.
  console.warn('Supabase not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')

  const noop = async () => ({ data: null, error: new Error('Supabase not configured') })
  supabase = {
    from: () => ({ select: noop, insert: noop, update: noop, remove: noop }),
    storage: {
      from: () => ({
        upload: async () => ({ error: new Error('Supabase not configured') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: async () => ({ error: new Error('Supabase not configured') })
      })
    },
    channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {}, unsubscribe: () => {} }),
    removeChannel: () => {}
  }
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey)
  } catch (err) {
    console.warn('Failed to create Supabase client:', err)
    const noop = async () => ({ data: null, error: new Error('Supabase not configured') })
    supabase = {
      from: () => ({ select: noop, insert: noop, update: noop, remove: noop }),
      storage: { from: () => ({ upload: async () => ({ error: new Error('Supabase not configured') }), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({ error: new Error('Supabase not configured') }) }) },
      channel: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {}, unsubscribe: () => {} }),
      removeChannel: () => {}
    }
  }
}

export { supabase }
