import { supabase } from './supabase.js';
import { showToast } from './ui.js';
import { getProfile, createDefaultProfile } from './profile.js';

// ================================================================
//  AUTENTICACIÓN CON PERSISTENCIA Y VERIFICACIÓN DE SESIÓN
// ================================================================
let isLoginMode = true;
let authInitialized = false;

export function initAuth(loginModal, closeLoginModal, loginEmail, loginPassword, loginActionBtn, loginToggleBtn, loginToggleLink, loginModeText, loginTitle, loginBtn, logoutBtn, onAuthChange) {

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

    // Función para procesar usuario y perfil
    async function handleUser(session) {
        if (session) {
            const user = session.user;
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
    }

    // Configurar listener solo una vez
    if (!authInitialized) {
        authInitialized = true;
        // Escuchar cambios de autenticación
        supabase.auth.onAuthStateChange(async (event, session) => {
            await handleUser(session);
        });

        // Verificar sesión actual al cargar la página
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            await handleUser(session);
        }).catch(err => {
            console.error('Error obteniendo sesión:', err);
            onAuthChange(null, 'Gemini');
        });
    }
}
