import { supabase } from './supabase.js';
import { showToast } from './ui.js';

// ================================================================
//  PERFIL DE USUARIO (preferencias) CON MANEJO DE RLS
// ================================================================

export async function getProfile(userId) {
    if (!userId) return null;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error && error.code !== 'PGRST116') {
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
            if (error.code === '42501') {
                showToast('⚠️ Error de permisos (RLS). Ejecuta las políticas SQL en Supabase.', 'error', 6000);
            } else if (error.code === '23505') {
                // Duplicado, probablemente ya existe, intentamos obtenerlo
                return await getProfile(userId);
            }
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
            .upsert({ user_id: userId, ai_preference: aiName, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) {
            console.error('Error en upsert:', error);
            if (error.code === '42501') {
                showToast('⚠️ Error de permisos (RLS). Ejecuta las políticas SQL en Supabase.', 'error', 6000);
            } else if (error.code === '23505') {
                // Conflicto de clave primaria, intentar actualizar directamente
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ ai_preference: aiName, updated_at: new Date().toISOString() })
                    .eq('user_id', userId);
                if (updateError) {
                    showToast('Error al actualizar preferencia: ' + updateError.message, 'error');
                    return false;
                }
                return true;
            } else {
                showToast('Error al guardar preferencia: ' + error.message, 'error');
            }
            return false;
        }
        return true;
    } catch (err) {
        console.error('Excepción en saveAiPreference:', err);
        showToast('Error: ' + err.message, 'error');
        return false;
    }
}
