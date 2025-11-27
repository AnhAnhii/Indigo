
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vnuchrpjvfxbghnrqfrq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudWNocnBqdmZ4YmdobnJxZnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMDg4OTgsImV4cCI6MjA3OTc4NDg5OH0.GElyetpgl9hAolftooZv9oyIE8bEKAdeOR35a74_4Rs'

export const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
})
