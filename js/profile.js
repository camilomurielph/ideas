import { supabase } from './supabase.js';
import { showToast } from './ui.js';

// ================================================================
//  PERFIL DE USUARIO (preferencias)
// ================================================================

export async function getProfile(userId) {
    if (!userId) return null;
    try {
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
    } catch (err) {
        console.error('Excepción en getProfile:', err);
        return null;
    }
}

export async function createDefaultProfile(userId) {
    const defaultProfile = {
        user_id: userId,
        ai_preference: 'Gemini'
    };
    try {
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
    } catch (err) {
        console.error('Excepción en createDefaultProfile:', err);
        return null;
    }
}

export async function saveAiPreference(userId, aiName) {
    if (!userId) {
        console.error('No userId provided');
        return false;
    }
    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({ user_id: userId, ai_preference: aiName }, { onConflict: 'user_id' });
        if (error) {
            console.error('Error en upsert:', error);
            showToast('Error al guardar preferencia: ' + error.message, 'error');
            return false;
        }
        return true;
    } catch (err) {
        console.error('Excepción en saveAiPreference:', err);
        showToast('Error: ' + err.message, 'error');
        return false;
    }
}
