import { showToast, copyToClipboard, openGemini } from './ui.js';

// ================================================================
//  MICRÓFONO Y TRANSCRIPCIÓN
// ================================================================
let isRecording = false;
let recognition = null;
let transcript = "";
let finalTranscript = "";
let isStoppedByUser = false;

// Prompt fijo: Markdown
const PROMPT = `Eres un organizador de pensamientos, no un vendedor. Tu única misión es tomar mi transcripción de voz (que puede estar desordenada, con frases cortadas, muletillas o ideas saltando de un lado a otro) y ayudarme a **ordenar el caos** de mi cabeza.

Reglas estrictas que debes seguir:

1. Formato de salida: Devuelve ÚNICAMENTE un bloque de código en Markdown (\`\`\`markdown ... \`\`\`). No escribas absolutamente nada fuera de este bloque.

2. Título: Genera un título concreto y coherente que refleje fielmente el tema central de mi idea. Que sea descriptivo, no comercial.

3. Estructura libre y adaptable: NO uses plantillas rígidas como "Visión Ejecutiva", "Desglose Conceptual" o "Próximos pasos" a menos que encajen naturalmente. En su lugar, observa la naturaleza de lo que te cuento (puede ser una app, un proyecto, un video, una reflexión filosófica, un problema personal, etc.) y **elige la estructura que mejor le siente**. Usa los títulos de sección (##) que creas convenientes para darle coherencia, pero si la idea es sencilla, incluso puedes prescindir de ellos y usar solo párrafos y viñetas sueltas.

4. Adaptación al tamaño: Si mi transcripción es corta y simple, devuélveme un desarrollo breve y conciso, solo lo justo para que se entienda mejor que como lo dije. Si es compleja y larga, profundiza y divídela en más partes. La longitud final debe ser proporcional a la complejidad de lo que he dicho. No alargues ni recortes artificialmente.

5. Fidelidad absoluta: No inventes cosas que no he dicho, no cambies el enfoque ni le des un giro "cool" o "comercial" a mi idea. Tu trabajo es pulir y ordenar, no reescribir. Si hay vacíos lógicos, puedes rellenarlos solo si son evidentes y necesarios para la coherencia, pero siempre manteniendo mi intención original.

Al final de todo el desarrollo, y **solo al final**, añade una sección llamada "Otras perspectivas y mejoras". Aquí sí quiero que te tomes libertades constructivas. Sugiere 2 o 3 formas alternativas de abordar la idea, pequeños ajustes que no haya considerado, preguntas clave que debería hacerme, o herramientas/recursos que podrían ayudarme a profundizar. Esta sección debe ser breve y en tono de sugerencia, no de orden.

Transcripción:`;

export function initMic(micBtn, micStatus, helpText, transcriptArea, transcriptContent, nextBtnContainer, retryContainer, nextBtn, retryBtn) {
    // Ya no recibimos toggleSwitch ni toggleLabel

    function startRecognition() {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                showToast('Tu navegador no soporta reconocimiento de voz', 'error');
                return;
            }
            recognition = new SpeechRecognition();
            recognition.lang = 'es-ES';
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                isRecording = true;
                isStoppedByUser = false;
                micBtn.classList.remove('error-state');
                micBtn.classList.add('recording');
                micBtn.textContent = '⏹️';
                micStatus.textContent = '🎙️ Grabando… (habla sin pausa)';
                micStatus.className = 'mic-status recording';
                retryContainer.style.display = 'none';
                nextBtnContainer.classList.remove('visible');
                showToast('🎤 Grabando...', 'info', 2000);
            };

            recognition.onresult = (event) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const part = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        final += part;
                    } else {
                        interim += part;
                    }
                }
                if (final) {
                    finalTranscript += final + ' ';
                }
                const displayText = finalTranscript + interim;
                if (displayText.trim()) {
                    transcriptArea.classList.add('visible');
                    transcriptContent.textContent = displayText;
                }
                transcript = finalTranscript + interim;
            };

            recognition.onerror = (event) => {
                console.error('Speech error:', event.error);
                let errorMsg = event.error;
                if (errorMsg === 'network') {
                    showToast('⚠️ Error de red. Reintenta manualmente.', 'warning', 5000);
                    micStatus.textContent = '⚠️ Error de red';
                    micStatus.className = 'mic-status error';
                    micBtn.classList.remove('recording');
                    micBtn.classList.add('error-state');
                    micBtn.textContent = '❌';
                    isRecording = false;
                    retryContainer.style.display = 'flex';
                    if (finalTranscript.trim()) {
                        transcriptArea.classList.add('visible');
                        transcriptContent.textContent = finalTranscript.trim();
                        nextBtnContainer.classList.add('visible');
                    }
                } else if (errorMsg === 'not-allowed') {
                    showToast('❌ Permiso denegado. Concede acceso al micrófono.', 'error', 5000);
                    micStatus.textContent = '🚫 Permiso denegado';
                    micStatus.className = 'mic-status error';
                    resetUI();
                } else if (errorMsg === 'no-speech') {
                    // silencio, no hacer nada
                } else if (errorMsg === 'audio-capture') {
                    showToast('❌ No se pudo acceder al micrófono. ¿Está conectado?', 'error', 4000);
                    resetUI();
                } else {
                    showToast(`❌ Error: ${errorMsg}`, 'error', 4000);
                    resetUI();
                }
            };

            recognition.onend = () => {
                if (isRecording && !isStoppedByUser) {
                    if (!micBtn.classList.contains('error-state')) {
                        showToast('⚠️ La grabación se detuvo inesperadamente. Reintenta.', 'warning', 4000);
                        micStatus.textContent = '⚠️ Detenido inesperadamente';
                        micStatus.className = 'mic-status error';
                        micBtn.classList.remove('recording');
                        micBtn.classList.add('error-state');
                        micBtn.textContent = '❌';
                        isRecording = false;
                        retryContainer.style.display = 'flex';
                        if (finalTranscript.trim()) {
                            transcriptArea.classList.add('visible');
                            transcriptContent.textContent = finalTranscript.trim();
                            nextBtnContainer.classList.add('visible');
                        }
                    }
                } else if (isStoppedByUser) {
                    handleStop();
                } else {
                    resetUI();
                }
            };

            recognition.start();
        } catch (err) {
            console.error('Error al iniciar reconocimiento:', err);
            showToast('❌ Error al iniciar el micrófono: ' + err.message, 'error', 4000);
            resetUI();
        }
    }

    function toggleRecording() {
        if (micBtn.disabled) {
            showToast('El micrófono no está disponible', 'error', 3000);
            return;
        }

        if (micBtn.classList.contains('error-state')) {
            resetUI();
            startRecognition();
            return;
        }

        if (isRecording) {
            isStoppedByUser = true;
            if (recognition) {
                recognition.stop();
            }
            return;
        }

        if (!isRecording) {
            startRecognition();
        }
    }

    function handleStop() {
        isRecording = false;
        micBtn.classList.remove('recording', 'error-state');
        micBtn.textContent = '🎤';
        micStatus.textContent = '⏹️ Grabación detenida';
        micStatus.className = 'mic-status done';

        if (transcript.trim() || finalTranscript.trim()) {
            const finalText = transcript.trim() || finalTranscript.trim();
            transcriptArea.classList.add('visible');
            transcriptContent.textContent = finalText;
            nextBtnContainer.classList.add('visible');
            transcript = finalText;
            showToast('✅ Transcripción lista', 'success', 2000);
        } else {
            showToast('No se captó ninguna palabra', 'error', 3000);
            resetUI();
        }
        if (recognition) {
            try {
                recognition.abort();
            } catch (e) {}
            recognition = null;
        }
    }

    function resetUI() {
        isRecording = false;
        isStoppedByUser = false;
        micBtn.classList.remove('recording', 'error-state');
        micBtn.textContent = '🎤';
        if (recognition) {
            try {
                recognition.abort();
            } catch (e) {}
            recognition = null;
        }
        if (!micStatus.classList.contains('done') && !micStatus.classList.contains('error')) {
            micStatus.textContent = 'Toca el micrófono para empezar';
            micStatus.className = 'mic-status';
        }
        nextBtnContainer.classList.remove('visible');
        retryContainer.style.display = 'none';
    }

    function handleNext() {
        const text = transcript.trim() || finalTranscript.trim();
        if (!text) {
            showToast('No hay transcripción para procesar', 'error', 3000);
            return;
        }

        const fullText = PROMPT + '\n\n' + text;
        copyToClipboard(fullText)
            .then(() => {
                showToast('✅ Prompt copiado al portapapeles', 'success', 3000);
                openGemini();
            })
            .catch((err) => {
                console.error('Error al copiar:', err);
                showToast('❌ No se pudo copiar', 'error', 4000);
            });
    }

    function handleRetry() {
        resetUI();
        retryContainer.style.display = 'none';
        startRecognition();
    }

    // Asignar eventos
    micBtn.addEventListener('click', toggleRecording);
    nextBtn.addEventListener('click', handleNext);
    retryBtn.addEventListener('click', handleRetry);
}
