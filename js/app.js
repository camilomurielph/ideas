// ================================================================
//  PUNTO DE ENTRADA DE LA APLICACIÓN
// ================================================================
import { supabase } from './supabase.js';  // Solo para asegurar que se cargue
import { initAuth } from './auth.js';
import { loadIdeas, renderIdeaList, createIdea, updateIdea, deleteIdea, getIdeas, getCurrentIdeaId, setCurrentIdeaId } from './ideas.js';
import { initMic } from './mic.js';
import { showToast } from './ui.js';

// ================================================================
//  DOM REFS
// ================================================================
const $ = id => document.getElementById(id);

const authSection = $('authSection');
const loginBtn = $('loginBtn');
const loginModal = $('loginModal');
const closeLoginModal = $('closeLoginModal');
const loginEmail = $('loginEmail');
const loginPassword = $('loginPassword');
const loginActionBtn = $('loginActionBtn');
const loginToggleBtn = $('loginToggleBtn');
const loginToggleLink = $('loginToggleLink');
const loginModeText = $('loginModeText');
const loginTitle = $('loginTitle');
const logoutBtn = $('logoutBtn');
const userEmailDisplay = $('userEmailDisplay');

const sidebar = $('sidebar');
const sidebarOverlay = $('sidebarOverlay');
const hamburgerBtn = $('hamburgerBtn');
const ideaList = $('ideaList');
const newIdeaBtn = $('newIdeaBtn');
const newIdeaModal = $('newIdeaModal');
const closeNewIdeaModal = $('closeNewIdeaModal');
const newIdeaTitle = $('newIdeaTitle');
const newIdeaContent = $('newIdeaContent');
const saveIdeaBtn = $('saveIdeaBtn');
const cancelNewIdeaBtn = $('cancelNewIdeaBtn');

const viewIdeaModal = $('viewIdeaModal');
const closeViewIdeaModal = $('closeViewIdeaModal');
const viewIdeaTitle = $('viewIdeaTitle');
const viewIdeaPreview = $('viewIdeaPreview');
const viewIdeaEditor = $('viewIdeaEditor');
const viewIdeaBody = $('viewIdeaBody');
const viewIdeaFooter = $('viewIdeaFooter');
const editIdeaBtn = $('editIdeaBtn');
const deleteIdeaBtn = $('deleteIdeaBtn');
const cancelEditIdeaBtn = $('cancelEditIdeaBtn');
const updateIdeaBtn = $('updateIdeaBtn');

const micBtn = $('micBtn');
const micStatus = $('micStatus');
const helpText = $('helpText');
const transcriptArea = $('transcriptArea');
const transcriptContent = $('transcriptContent');
const nextBtnContainer = $('nextBtnContainer');
const nextBtn = $('nextBtn');
const retryContainer = $('retryContainer');
const retryBtn = $('retryBtn');
const toggleSwitch = $('toggleSwitch');
const toggleLabel = $('toggleLabel');

const mainTitle = $('mainTitle');

// ================================================================
//  ESTADO
// ================================================================
let currentUser = null;

// ================================================================
//  FUNCIONES DE UI (sidebar, modales)
// ================================================================
function toggleSidebar(open) {
    if (open === undefined) {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
    } else if (open) {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
    } else {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    }
}

hamburgerBtn.addEventListener('click', () => toggleSidebar());
sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

document.addEventListener('click', (e) => {
    if (window.innerWidth > 768) return;
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== hamburgerBtn &&
        !hamburgerBtn.contains(e.target)) {
        toggleSidebar(false);
    }
});

// ================================================================
//  MANEJO DE IDEA (VER, EDITAR, ELIMINAR)
// ================================================================
let isEditing = false;

function openViewIdea(idea) {
    setCurrentIdeaId(idea.id);
    viewIdeaTitle.textContent = idea.title || 'Sin título';
    viewIdeaPreview.innerHTML = marked.parse(idea.content || '');
    viewIdeaEditor.value = idea.content || '';
    viewIdeaEditor.style.display = 'none';
    viewIdeaPreview.style.display = 'block';
    viewIdeaFooter.style.display = 'none';
    isEditing = false;
    editIdeaBtn.textContent = '✏️ Editar';
    viewIdeaModal.classList.add('open');

    // Asignar eventos (se reasignan cada vez que se abre)
    editIdeaBtn.onclick = () => enterEditMode(idea);
    deleteIdeaBtn.onclick = () => handleDeleteIdea(idea.id);
    cancelEditIdeaBtn.onclick = () => cancelEdit(idea);
    updateIdeaBtn.onclick = () => handleUpdateIdea(idea.id);
}

function enterEditMode(idea) {
    isEditing = true;
    viewIdeaEditor.style.display = 'block';
    viewIdeaPreview.style.display = 'none';
    viewIdeaFooter.style.display = 'flex';
    editIdeaBtn.textContent = '👁️ Ver';
    editIdeaBtn.onclick = () => cancelEdit(idea);
    viewIdeaEditor.focus();
}

function cancelEdit(idea) {
    isEditing = false;
    viewIdeaEditor.style.display = 'none';
    viewIdeaPreview.style.display = 'block';
    viewIdeaFooter.style.display = 'none';
    editIdeaBtn.textContent = '✏️ Editar';
    editIdeaBtn.onclick = () => enterEditMode(idea);
    viewIdeaPreview.innerHTML = marked.parse(idea.content || '');
    viewIdeaEditor.value = idea.content || '';
}

async function handleUpdateIdea(id) {
    const newContent = viewIdeaEditor.value.trim();
    if (!newContent) {
        showToast('El contenido no puede estar vacío', 'warning');
        return;
    }
    const newTitle = viewIdeaTitle.textContent.trim() || 'Sin título';
    try {
        await updateIdea(id, newTitle, newContent);
        // Actualizar la lista y el modal
        const updatedIdea = getIdeas().find(i => i.id === id);
        if (updatedIdea) {
            viewIdeaTitle.textContent = updatedIdea.title;
            viewIdeaPreview.innerHTML = marked.parse(updatedIdea.content || '');
            viewIdeaEditor.value = updatedIdea.content || '';
            cancelEdit(updatedIdea);
        }
        renderIdeaList(ideaList, openViewIdea);
        showToast('✅ Idea actualizada', 'success');
    } catch (err) {
        showToast('Error al actualizar: ' + err.message, 'error');
    }
}

async function handleDeleteIdea(id) {
    if (!confirm('¿Eliminar esta idea permanentemente?')) return;
    try {
        await deleteIdea(id);
        renderIdeaList(ideaList, openViewIdea);
        viewIdeaModal.classList.remove('open');
        setCurrentIdeaId(null);
        showToast('🗑️ Idea eliminada', 'info');
    } catch (err) {
        showToast('Error al eliminar: ' + err.message, 'error');
    }
}

// ================================================================
//  NUEVA IDEA
// ================================================================
newIdeaBtn.addEventListener('click', () => {
    if (!currentUser) {
        showToast('Inicia sesión para guardar ideas', 'warning');
        return;
    }
    newIdeaModal.classList.add('open');
    newIdeaTitle.value = '';
    newIdeaContent.value = '';
    setTimeout(() => newIdeaTitle.focus(), 100);
});

closeNewIdeaModal.addEventListener('click', () => newIdeaModal.classList.remove('open'));
cancelNewIdeaBtn.addEventListener('click', () => newIdeaModal.classList.remove('open'));
newIdeaModal.addEventListener('click', (e) => {
    if (e.target === newIdeaModal) newIdeaModal.classList.remove('open');
});

saveIdeaBtn.addEventListener('click', async () => {
    if (!currentUser) {
        showToast('Inicia sesión para guardar', 'warning');
        return;
    }
    const title = newIdeaTitle.value.trim() || 'Sin título';
    const content = newIdeaContent.value.trim();
    if (!content) {
        showToast('El contenido no puede estar vacío', 'warning');
        return;
    }
    try {
        await createIdea(title, content, currentUser.id);
        renderIdeaList(ideaList, openViewIdea);
        newIdeaModal.classList.remove('open');
        showToast('✅ Idea guardada', 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

// ================================================================
//  CERRAR MODAL DE VER IDEA
// ================================================================
closeViewIdeaModal.addEventListener('click', () => {
    viewIdeaModal.classList.remove('open');
    setCurrentIdeaId(null);
});
viewIdeaModal.addEventListener('click', (e) => {
    if (e.target === viewIdeaModal) {
        viewIdeaModal.classList.remove('open');
        setCurrentIdeaId(null);
    }
});

// ================================================================
//  AUTENTICACIÓN (callback)
// ================================================================
function onAuthChange(user) {
    if (user) {
        currentUser = user;
        userEmailDisplay.textContent = user.email;
        authSection.innerHTML = `
            <div class="user-badge">
                <span class="email">${user.email}</span>
            </div>
        `;
        sidebar.style.display = 'flex';
        mainTitle.textContent = '🎙️ ideas';
        // Cargar ideas y renderizar
        loadIdeas(user.id).then(() => {
            renderIdeaList(ideaList, openViewIdea);
        });
    } else {
        currentUser = null;
        authSection.innerHTML = `<button class="btn-login" id="loginBtn">Iniciar sesión</button>`;
        document.getElementById('loginBtn').addEventListener('click', () => {
            loginModal.classList.add('open');
        });
        sidebar.style.display = 'none';
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
        mainTitle.textContent = '🎙️ ideas';
        // Limpiar lista
        ideaList.innerHTML = `<div style="color: rgba(255,255,255,0.2); text-align: center; padding: 2rem 0; font-size: 0.9rem;">
            No hay ideas aún.<br />Crea tu primera idea.
        </div>`;
        viewIdeaModal.classList.remove('open');
    }
}

// Inicializar autenticación
initAuth(loginModal, closeLoginModal, loginEmail, loginPassword, loginActionBtn, loginToggleBtn, loginToggleLink, loginModeText, loginTitle, loginBtn, logoutBtn, onAuthChange);

// ================================================================
//  INICIALIZAR MICRÓFONO
// ================================================================
initMic(micBtn, micStatus, helpText, transcriptArea, transcriptContent, nextBtnContainer, retryContainer, nextBtn, retryBtn, toggleSwitch, toggleLabel);

// ================================================================
//  INICIO
// ================================================================
showToast('Bienvenido a ideas', 'info', 3000);
console.log('🎙️ ideas app v10.0 - modularizada');
