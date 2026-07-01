import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Crear el cliente de Supabase y exportarlo
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
