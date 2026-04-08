import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://otsunkqrncwhpiwmqjqq.supabase.co'
const supabaseKey = 'sb_publishable_R293Y9DBZad-GcLFdcBs2g_vzx2qvLa'

export const supabase = createClient(supabaseUrl, supabaseKey)