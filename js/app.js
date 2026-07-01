// ================================================================
//  PUNTO DE ENTRADA DE LA APLICACIÓN
// ================================================================
import { supabase } from './supabase.js';
import { initAuth } from './auth.js';
import { loadIdeas, renderIdeaList, createIdea, updateIdea, deleteIdea, getIdeas, getCurrentIdeaId, setCurrentIdeaId } from './ideas.js';
import { initMic } from './mic.js';
import { showToast, copyToClipboard, getPlainText, pasteFromClipboard } from './ui.js';
import { saveAiPreference } from './profile.js';

// ... (resto del código igual hasta los eventos)

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
    console.log('🔹 Click en Guardar preferencias');
    if (!currentUser) {
        showToast('Inicia sesión para guardar', 'warning');
        return;
    }
    const selectedAI = aiSelect.value;
    console.log('IA seleccionada:', selectedAI);
    const success = await saveAiPreference(currentUser.id, selectedAI);
    if (success) {
        currentAI = selectedAI;
        showToast(`✅ Preferencia guardada: ${selectedAI}`, 'success');
        configModal.classList.remove('open');
        // Actualizar mensajes que mencionan la IA
        if (waitingForGemini) {
            showWaitingForGemini();
        }
        // Actualizar placeholders del modal de nueva idea si está abierto
        if (newIdeaModal.classList.contains('open')) {
            newIdeaContent.placeholder = `Pega aquí el contenido desarrollado por ${currentAI}...`;
        }
    } else {
        // El error ya se muestra en saveAiPreference
    }
});

// ... (resto del código)
