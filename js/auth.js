import { supabase } from './supabase.js';
import { showToast } from './ui.js';
import { getProfile, createDefaultProfile } from './profile.js';

// ================================================================
//  AUTENTICACIÓN
// ================================================================
let isLoginMode = true;

export function initAuth(loginModal, closeLoginModal, loginEmail, loginPassword, loginActionBtn, loginToggleBtn, loginToggleLink, loginModeText, loginTitle, loginBtn, logoutBtn, onAuthChange) {
    // Toggle entre login y registro
    function toggleLoginMode() {
        isLoginMode = !isLoginMode;
        loginTitle.textContent = isLoginMode ? 'Iniciar sesión' : 'Registrarse';
        loginActionBtn.textContent = isLoginMode ? 'Iniciar sesión' : 'Registrarse';
        loginToggleBtn.textContent = isLoginMode ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión';
        loginModeText.innerHTML = isLoginMode ?
            '¿No tienes cuenta? <a id="loginToggleLink">Regístrate</a>' :
            '¿Ya tienes cuenta? <a id="loginToggleLink">Inicia sesión</a>';
        document.getElementById('loginToggleLink').addEventListener('click', toggleLoginMode);
    }

    loginToggleBtn.addEventListener('click', toggleLoginMode);
    loginToggleLink?.addEventListener('click', toggleLoginMode);

    async function handleLogin() {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();
        if (!email || !password) {
            showToast('Completa todos los campos', 'error');
            return;
        }
        try {
            let result;
            if (isLoginMode) {
                result = await supabase.auth.signInWithPassword({ email, password });
            } else {
                result = await supabase.auth.signUp({ email, password });
            }
            if (result.error) throw result.error;
            showToast(isLoginMode ? '¡Bienvenido!' : '¡Registro exitoso!', 'success');
            loginModal.classList.remove('open');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    loginActionBtn.addEventListener('click', handleLogin);
    loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
    loginEmail.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });

    loginBtn.addEventListener('click', () => {
        loginModal.classList.add('open');
        loginEmail.value = '';
        loginPassword.value = '';
        if (!isLoginMode) toggleLoginMode();
    });
    closeLoginModal.addEventListener('click', () => loginModal.classList.remove('open'));
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.classList.remove('open');
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await supabase.auth.signOut();
            showToast('Sesión cerrada', 'info');
        } catch (err) {
            showToast('Error al cerrar sesión: ' + err.message, 'error');
        }
    });

    // Escuchar cambios de autenticación y cargar perfil
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            const user = session.user;
            // Obtener o crear perfil
            let profile = await getProfile(user.id);
            if (!profile) {
                profile = await createDefaultProfile(user.id);
            }
            if (profile) {
                onAuthChange(user, profile.ai_preference);
            } else {
                onAuthChange(user, 'Gemini');
            }
        } else {
            onAuthChange(null, 'Gemini');
        }
    });
}
