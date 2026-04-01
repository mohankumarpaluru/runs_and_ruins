/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zsvtciqzelqdbdwxhnwy.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'sb_publishable_L7r0QSPLBjJNHGR0YpJ5eQ_AmPHuv0j';

export const supabase = createClient(supabaseUrl, supabaseKey);
