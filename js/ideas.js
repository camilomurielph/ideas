import { supabase } from './app.js';
import { showToast, formatDate } from './ui.js';

// ================================================================
//  GESTIÓN DE IDEAS (CRUD)
// ================================================================
let ideas = [];
let currentIdeaId = null;

export function getIdeas() { return ideas; }
export function getCurrentIdeaId() { return currentIdeaId; }
export function setCurrentIdeaId(id) { currentIdeaId = id; }

export async function loadIdeas(userId) {
    if (!userId) return;
    const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
    if (error) {
        showToast('Error al cargar ideas: ' + error.message, 'error');
        return;
    }
    ideas = data || [];
    return ideas;
}

export function renderIdeaList(ideaListElement, onItemClick) {
    if (ideas.length === 0) {
        ideaListElement.innerHTML = `<div style="color: rgba(255,255,255,0.2); text-align: center; padding: 2rem 0; font-size: 0.9rem;">
            No hay ideas aún.<br />Crea tu primera idea.
        </div>`;
        return;
    }
    let html = '';
    ideas.forEach(idea => {
        const active = idea.id === currentIdeaId ? 'active' : '';
        html += `
            <div class="idea-item ${active}" data-id="${idea.id}">
                <span class="title">${idea.title || 'Sin título'}</span>
                <span class="date">${formatDate(idea.updated_at)}</span>
            </div>
        `;
    });
    ideaListElement.innerHTML = html;

    ideaListElement.querySelectorAll('.idea-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.id;
            const idea = ideas.find(i => i.id === id);
            if (idea && onItemClick) {
                onItemClick(idea);
            }
        });
    });
}

export async function createIdea(title, content, userId) {
    if (!userId) throw new Error('Usuario no autenticado');
    const { data, error } = await supabase
        .from('ideas')
        .insert([{ user_id: userId, title, content }])
        .select();
    if (error) throw error;
    if (data && data.length > 0) {
        ideas.unshift(data[0]);
        currentIdeaId = data[0].id;
        return data[0];
    }
    return null;
}

export async function updateIdea(id, title, content) {
    const { error } = await supabase
        .from('ideas')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;
    const idea = ideas.find(i => i.id === id);
    if (idea) {
        idea.title = title;
        idea.content = content;
        idea.updated_at = new Date().toISOString();
    }
    return idea;
}

export async function deleteIdea(id) {
    const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', id);
    if (error) throw error;
    ideas = ideas.filter(i => i.id !== id);
    if (currentIdeaId === id) {
        currentIdeaId = null;
    }
}
