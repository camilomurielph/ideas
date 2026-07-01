// ================================================================
//  PUNTO DE ENTRADA DE LA APLICACIÓN
// ================================================================
import { supabase } from './supabase.js';
import { initAuth } from './auth.js';
import { loadIdeas, renderIdeaList, createIdea, updateIdea, deleteIdea, getIdeas, getCurrentIdeaId, setCurrentIdeaId } from './ideas.js';
import { initMic } from './mic.js';
import { showToast, copyToClipboard, getPlainText, pasteFromClipboard } from './ui.js';
import { saveAiPreference, getAIUrl } from './profile.js';

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
const viewIdeaTitleInput = $('viewIdeaTitleInput');
const viewIdeaPreview = $('viewIdeaPreview');
const viewIdeaEditor = $('viewIdeaEditor');
const viewIdeaFooter = $('viewIdeaFooter');
const moreOptionsBtn = $('moreOptionsBtn');
const dropdownMenu = $('dropdownMenu');
const editOptionBtn = $('editOptionBtn');
const deleteOptionBtn = $('deleteOptionBtn');
const copyMdOptionBtn = $('copyMdOptionBtn');
const copyPlainOptionBtn = $('copyPlainOptionBtn');
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

const newIdeaMainBtn = $('newIdeaMainBtn');
const pasteFromClipboardBtn = $('pasteFromClipboardBtn');

const configBtn = $('configBtn');
const configModal = $('configModal');
const closeConfigModal = $('closeConfigModal');
const aiSelect = $('aiSelect');
const saveConfigBtn = $('saveConfigBtn');

const mainTitle = $('mainTitle');

// ================================================================
//  ESTADO
// ================================================================
let currentUser = null;
let currentAI = 'Gemini';
let currentIdea = null;
let waitingForGemini = false;
let lastTranscript = '';

// ================================================================
//  FUNCIONES DE UI
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
//  GUÍA CONTEXTUAL
// ================================================================
function resetGuia() {
    waitingForGemini = false;
    newIdeaMainBtn.style.display = 'none';
    helpText.innerHTML = '💡 Explícame tu idea con lujo de detalles';
    newIdeaContent.placeholder = 'Pega aquí el contenido desarrollado por Gemini...';
    if (pasteFromClipboardBtn) pasteFromClipboardBtn.style.display = 'none';
}

function showWaitingForGemini() {
    waitingForGemini = true;
    helpText.innerHTML = `📋 ¿Ya tienes el resultado de ${currentAI}? Crea una nueva idea y pégalo.`;
    newIdeaMainBtn.style.display = 'block';
}

// ================================================================
//  EVENTO DE FOCO PARA DETECTAR REGRESO
// ================================================================
window.addEventListener('focus', () => {
    if (waitingForGemini) {
        showWaitingForGemini();
    }
});

// ================================================================
//  MANEJO DEL MENÚ DESPLEGABLE
// ================================================================
function toggleDropdown(e) {
    e.stopPropagation();
    dropdownMenu.classList.toggle('open');
}

document.addEventListener('click', () => {
    dropdownMenu.classList.remove('open');
});

moreOptionsBtn.addEventListener('click', toggleDropdown);

// ================================================================
//  GENERAR TÍTULO POR DEFECTO
// ================================================================
function getNextDefaultTitle() {
    const ideas = getIdeas();
    if (!ideas || ideas.length === 0) return 'Idea 01';
    const numbers = ideas
        .map(idea => {
            const match = idea.title.match(/^Idea (\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + 1;
    return `Idea ${String(nextNum).padStart(2, '0')}`;
}

// ================================================================
//  MANEJO DE IDEA (VER, EDITAR, ELIMINAR, COPIAR)
// ================================================================
let isEditing = false;

function openViewIdea(idea) {
    currentIdea = idea;
    setCurrentIdeaId(idea.id);
    viewIdeaTitle.textContent = idea.title || 'Sin título';
    viewIdeaTitle.style.display = 'block';
    viewIdeaTitleInput.style.display = 'none';
    viewIdeaPreview.innerHTML = marked.parse(idea.content || '');
    viewIdeaEditor.value = idea.content || '';
    viewIdeaEditor.style.display = 'none';
    viewIdeaPreview.style.display = 'block';
    viewIdeaFooter.style.display = 'none';
    isEditing = false;
    editOptionBtn.textContent = '✏️ Editar';
    viewIdeaModal.classList.add('open');
    dropdownMenu.classList.remove('open');

    editOptionBtn.onclick = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove('open');
        enterEditMode(idea);
    };
    deleteOptionBtn.onclick = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove('open');
        handleDeleteIdea(idea.id);
    };
    copyMdOptionBtn.onclick = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove('open');
        copyMarkdown(idea);
    };
    copyPlainOptionBtn.onclick = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove('open');
        copyPlainText(idea);
    };
    cancelEditIdeaBtn.onclick = () => cancelEdit(idea);
    updateIdeaBtn.onclick = () => handleUpdateIdea(idea.id);
}

function enterEditMode(idea) {
    isEditing = true;
    viewIdeaTitle.style.display = 'none';
    viewIdeaTitleInput.style.display = 'block';
    viewIdeaTitleInput.value = idea.title || 'Sin título';
    viewIdeaEditor.style.display = 'block';
    viewIdeaPreview.style.display = 'none';
    viewIdeaFooter.style.display = 'flex';
    editOptionBtn.textContent = '👁️ Ver';
    editOptionBtn.onclick = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove('open');
        cancelEdit(idea);
    };
    viewIdeaEditor.focus();
}

function cancelEdit(idea) {
    isEditing = false;
    viewIdeaTitle.style.display = 'block';
    viewIdeaTitleInput.style.display = 'none';
    viewIdeaEditor.style.display = 'none';
    viewIdeaPreview.style.display = 'block';
    viewIdeaFooter.style.display = 'none';
    editOptionBtn.textContent = '✏️ Editar';
    editOptionBtn.onclick = (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove('open');
        enterEditMode(idea);
    };
    viewIdeaPreview.innerHTML = marked.parse(idea.content || '');
    viewIdeaEditor.value = idea.content || '';
}

async function handleUpdateIdea(id) {
    const newContent = viewIdeaEditor.value.trim();
    if (!newContent) {
        showToast('El contenido no puede estar vacío', 'warning');
        return;
    }
    const newTitle = viewIdeaTitleInput.value.trim() || 'Sin título';
    try {
        await updateIdea(id, newTitle, newContent);
        const updatedIdea = getIdeas().find(i => i.id === id);
        if (updatedIdea) {
            viewIdeaTitle.textContent = updatedIdea.title;
            viewIdeaTitleInput.value = updatedIdea.title;
            viewIdeaPreview.innerHTML = marked.parse(updatedIdea.content || '');
            viewIdeaEditor.value = updatedIdea.content || '';
            cancelEdit(updatedIdea);
            currentIdea = updatedIdea;
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
        currentIdea = null;
        showToast('🗑️ Idea eliminada', 'info');
    } catch (err) {
        showToast('Error al eliminar: ' + err.message, 'error');
    }
}

function copyMarkdown(idea) {
    const text = `# ${idea.title || 'Sin título'}\n\n${idea.content || ''}`;
    copyToClipboard(text).then(() => {
        showToast('📋 Copiado en formato Markdown', 'success');
    }).catch(() => {
        showToast('No se pudo copiar', 'error');
    });
}

function copyPlainText(idea) {
    const plain = getPlainText(idea.content || '');
    const text = `${idea.title || 'Sin título'}\n\n${plain}`;
    copyToClipboard(text).then(() => {
        showToast('📄 Copiado sin formato', 'success');
    }).catch(() => {
        showToast('No se pudo copiar', 'error');
    });
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
    newIdeaTitle.value = getNextDefaultTitle();
    newIdeaContent.value = '';
    newIdeaContent.placeholder = `Pega aquí el contenido desarrollado por ${currentAI}...`;
    if (pasteFromClipboardBtn) pasteFromClipboardBtn.style.display = 'none';
    setTimeout(() => newIdeaTitle.focus(), 100);
});

newIdeaMainBtn.addEventListener('click', () => {
    if (!currentUser) {
        showToast('Inicia sesión para guardar ideas', 'warning');
        return;
    }
    newIdeaModal.classList.add('open');
    newIdeaTitle.value = getNextDefaultTitle();
    newIdeaContent.value = '';
    newIdeaContent.placeholder = `Pega aquí el resultado que generó ${currentAI}...`;
    if (pasteFromClipboardBtn) pasteFromClipboardBtn.style.display = 'inline-block';
    setTimeout(() => newIdeaTitle.focus(), 100);
});

pasteFromClipboardBtn?.addEventListener('click', async () => {
    await pasteFromClipboard(newIdeaContent);
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
        showToast('✅ Idea guardada. Puedes grabar otra idea.', 'success', 3000);
        resetGuia();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
});

closeNewIdeaModal.addEventListener('click', () => newIdeaModal.classList.remove('open'));
cancelNewIdeaBtn.addEventListener('click', () => newIdeaModal.classList.remove('open'));
newIdeaModal.addEventListener('click', (e) => {
    if (e.target === newIdeaModal) newIdeaModal.classList.remove('open');
});

// ================================================================
//  CERRAR MODAL DE VER IDEA
// ================================================================
closeViewIdeaModal.addEventListener('click', () => {
    viewIdeaModal.classList.remove('open');
    setCurrentIdeaId(null);
    currentIdea = null;
});
viewIdeaModal.addEventListener('click', (e) => {
    if (e.target === viewIdeaModal) {
        viewIdeaModal.classList.remove('open');
        setCurrentIdeaId(null);
        currentIdea = null;
    }
});

// ================================================================
//  CONFIGURACIÓN DE CUENTA
// ================================================================
configBtn.addEventListener('click', () => {
    if (!currentUser) {
        showToast('Inicia sesión para configurar', 'warning');
        return;
    }
    aiSelect.value = currentAI;
    configModal.classList.add('open');
});

closeConfigModal.addEventListener('click', () => configModal.classList.remove('open'));
configModal.addEventListener('click', (e) => {
    if (e.target === configModal) configModal.classList.remove('open');
});

saveConfigBtn.addEventListener('click', async () => {
    if (!currentUser) {
        showToast('Inicia sesión para guardar', 'warning');
        return;
    }
    const selectedAI = aiSelect.value;
    const success = await saveAiPreference(currentUser.id, selectedAI);
    if (success) {
        currentAI = selectedAI;
        showToast(`✅ Preferencia guardada: ${selectedAI}`, 'success');
        configModal.classList.remove('open');
        // Actualizar mensajes que mencionan la IA
        if (helpText.innerHTML.includes('Gemini') || helpText.innerHTML.includes('Deepseek') || helpText.innerHTML.includes('Claude') || helpText.innerHTML.includes('ChatGPT')) {
            // Si hay un mensaje visible que menciona la IA, actualizarlo
            if (waitingForGemini) {
                showWaitingForGemini();
            } else if (helpText.innerHTML.includes('Transcripción lista')) {
                // No actualizamos automáticamente para no interferir
            }
        }
        // Actualizar placeholders del modal de nueva idea si está abierto
        if (newIdeaModal.classList.contains('open')) {
            newIdeaContent.placeholder = `Pega aquí el contenido desarrollado por ${currentAI}...`;
        }
    }
});

// ================================================================
//  AUTENTICACIÓN (callback)
// ================================================================
function onAuthChange(user, aiPreference) {
    if (user) {
        currentUser = user;
        currentAI = aiPreference || 'Gemini';
        authSection.innerHTML = `
            <div class="user-badge">
                <span class="email">${user.email}</span>
            </div>
        `;
        sidebar.style.display = 'flex';
        mainTitle.textContent = '🎙️ ideas';
        loadIdeas(user.id).then(() => {
            renderIdeaList(ideaList, openViewIdea);
        });
    } else {
        currentUser = null;
        currentAI = 'Gemini';
        authSection.innerHTML = `<button class="btn-login" id="loginBtn">Iniciar sesión</button>`;
        document.getElementById('loginBtn').addEventListener('click', () => {
            loginModal.classList.add('open');
        });
        sidebar.style.display = 'none';
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
        mainTitle.textContent = '🎙️ ideas';
        ideaList.innerHTML = `<div style="color: rgba(255,255,255,0.2); text-align: center; padding: 2rem 0; font-size: 0.9rem;">
            No hay ideas aún.<br />Crea tu primera idea.
        </div>`;
        viewIdeaModal.classList.remove('open');
        currentIdea = null;
        resetGuia();
    }
}

initAuth(loginModal, closeLoginModal, loginEmail, loginPassword, loginActionBtn, loginToggleBtn, loginToggleLink, loginModeText, loginTitle, loginBtn, logoutBtn, onAuthChange);

// ================================================================
//  INICIALIZAR MICRÓFONO CON CALLBACK Y GET AI
// ================================================================
function onNextCallback(transcription) {
    lastTranscript = transcription;
    showWaitingForGemini();
}

function getCurrentAI() {
    return currentAI;
}

initMic(micBtn, micStatus, helpText, transcriptArea, transcriptContent, nextBtnContainer, retryContainer, nextBtn, retryBtn, onNextCallback, getCurrentAI);

// ================================================================
//  INICIO
// ================================================================
resetGuia();
showToast('Bienvenido a ideas', 'info', 3000);
console.log('🎙️ ideas app v12.0 - con configuración de IA y textos dinámicos');
