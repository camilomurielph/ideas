import { supabase } from './supabase.js';
import { showToast } from './ui.js';
import { getProfile, createDefaultProfile } from './profile.js';

// ================================================================
//  AUTENTICACIÓN CON PERSISTENCIA ROBUSTA
// ================================================================
let isLoginMode = true;
let authInitialized = false;
let authCallback = null;

export function initAuth(callback) {
    // Guardar callback para usarlo después
    authCallback = callback;

    // Función para manejar el usuario y el perfil
    async function handleUser(session) {
        if (session) {
            const user = session.user;
            let profile = await getProfile(user.id);
            if (!profile) {
                profile = await createDefaultProfile(user.id);
            }
            if (profile) {
                authCallback(user, profile.ai_preference);
            } else {
                authCallback(user, 'Gemini');
            }
        } else {
            authCallback(null, 'Gemini');
        }
    }

    // Si ya está inicializado, no repetir
    if (authInitialized) {
        // Si ya está inicializado, pero la sesión puede haber cambiado, forzamos una verificación
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            await handleUser(session);
        }).catch(err => {
            console.error('Error obteniendo sesión:', err);
            authCallback(null, 'Gemini');
        });
        return;
    }

    authInitialized = true;

    // 1. Escuchar cambios de autenticación en tiempo real
    supabase.auth.onAuthStateChange(async (event, session) => {
        await handleUser(session);
    });

    // 2. Verificar sesión actual al cargar la página
    supabase.auth.getSession().then(async ({ data: { session } }) => {
        await handleUser(session);
    }).catch(err => {
        console.error('Error obteniendo sesión:', err);
        authCallback(null, 'Gemini');
    });

    // 3. Configurar eventos de login/logout (estos no dependen del DOM)
    // Los eventos se asignan desde app.js porque necesitan los elementos del DOM
}

// ================================================================
//  FUNCIONES PARA EL MANEJO DE LOGIN (se llaman desde app.js)
// ================================================================
export function setupLoginUI(loginBtn, userBadge, userEmailDisplay, logoutBtn, loginModal, closeLoginModal, loginEmail, loginPassword, loginActionBtn, loginToggleBtn, loginToggleLink, loginModeText, loginTitle) {

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

    // Evento para abrir el modal
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

    // También actualizar la UI según el estado actual de autenticación
    // Esto lo maneja el callback de auth.js
}