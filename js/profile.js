import { supabase } from './supabase.js';
import { showToast } from './ui.js';

// ================================================================
//  PERFIL DE USUARIO (preferencias)
// ================================================================

// Obtener el perfil del usuario actual
export async function getProfile(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error && error.code !== 'PGRST116') { // 404 not found
        console.error('Error al obtener perfil:', error);
        return null;
    }
    return data;
}

// Crear perfil por defecto
export async function createDefaultProfile(userId) {
    const defaultProfile = {
        user_id: userId,
        ai_preference: 'Gemini'
    };
    const { data, error } = await supabase
        .from('profiles')
        .insert([defaultProfile])
        .select()
        .single();
    if (error) {
        console.error('Error al crear perfil:', error);
        return null;
    }
    return data;
}

// Guardar preferencia de IA
export async function saveAiPreference(userId, aiName) {
    if (!userId) return;
    const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: userId, ai_preference: aiName }, { onConflict: 'user_id' });
    if (error) {
        showToast('Error al guardar preferencia: ' + error.message, 'error');
        return false;
    }
    return true;
}

// Obtener la URL de la IA según el nombre
export function getAIUrl(aiName) {
    const urls = {
        'Gemini': 'https://gemini.google.com',
        'Deepseek': 'https://chat.deepseek.com/',
        'Claude': 'https://claude.ai/new',
        'ChatGPT': 'https://chatgpt.com/'
    };
    return urls[aiName] || urls['Gemini'];
}
