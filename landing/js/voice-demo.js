/**
 * XORBIT 360 - Agente de Voz & Llamadas IA Interactive Simulator
 * Módulo: Confirmaciones & Cobros, Novedades, Campañas de Voz
 */

document.addEventListener('DOMContentLoaded', () => {
  const callDisplay = document.getElementById('voiceCallDisplay');
  const toggleCallBtn = document.getElementById('toggleVoiceCallBtn');
  const callStatusText = document.getElementById('voiceCallStatusText');
  const callTimerText = document.getElementById('voiceCallTimer');
  const transcriptLog = document.getElementById('voiceTranscriptLog');

  let isCallActive = false;
  let callSeconds = 0;
  let callTimerInterval = null;
  let stepTimeout = null;

  const conversationSteps = [
    { time: 2, sender: 'agent', text: '🤖 Agente IA: "Hola, ¿me comunico con David? Te hablo de Xorbit Store sobre tu pedido del Kit Smart Pro."' },
    { time: 5, sender: 'client', text: '👤 David: "Sí, hola, con él mismo. ¿Ocurre algo con el envío?"' },
    { time: 9, sender: 'agent', text: '🤖 Agente IA: "Todo perfecto David. Queremos confirmar tu dirección en Calle 72 # 11-24 Bogotá para entrega mañana antes de las 3:00 PM contra entrega."' },
    { time: 14, sender: 'client', text: '👤 David: "Exacto, esa es la dirección y estaré atento para recibirlo."' },
    { time: 18, sender: 'agent', text: '🤖 Agente IA: "Excelente David. Tu pedido ha sido confirmado en el sistema y el repartidor fue asignado. ¡Que tengas un excelente día!"' },
    { time: 22, sender: 'agent', text: '✅ Sistema Xorbit: [Estado de Pedido actualizado a APROBADO & DESPACHADO]' }
  ];

  function formatTime(secs) {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  }

  function startVoiceCall() {
    isCallActive = true;
    callSeconds = 0;
    if (callDisplay) callDisplay.classList.add('active');
    if (toggleCallBtn) {
      toggleCallBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.11-8.69A2 2 0 0 1 3.23 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.21 9.91"/></svg>
        Finalizar Simulación
      `;
      toggleCallBtn.className = 'btn btn-primary';
      toggleCallBtn.style.background = '#ef4444';
    }
    if (callStatusText) callStatusText.textContent = 'En llamada activa (Voz Sintética Ultra-realista)';

    if (transcriptLog) {
      transcriptLog.innerHTML = '<div class="transcript-entry agent">📞 Conectando con cliente en tiempo real...</div>';
    }

    // Cronómetro
    callTimerInterval = setInterval(() => {
      callSeconds++;
      if (callTimerText) callTimerText.textContent = formatTime(callSeconds);

      // Desplegar diálogos según el segundo
      const currentStep = conversationSteps.find(step => step.time === callSeconds);
      if (currentStep && transcriptLog) {
        const entry = document.createElement('div');
        entry.className = `transcript-entry ${currentStep.sender}`;
        entry.innerHTML = currentStep.text;
        transcriptLog.appendChild(entry);
        transcriptLog.scrollTop = transcriptLog.scrollHeight;
      }

      if (callSeconds >= 24) {
        stopVoiceCall();
      }
    }, 1000);
  }

  function stopVoiceCall() {
    isCallActive = false;
    clearInterval(callTimerInterval);
    if (callDisplay) callDisplay.classList.remove('active');
    if (toggleCallBtn) {
      toggleCallBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Iniciar Simulación de Llamada
      `;
      toggleCallBtn.className = 'btn btn-primary';
      toggleCallBtn.style.background = '';
    }
    if (callStatusText) callStatusText.textContent = 'Llamada finalizada • 100% Pedido confirmado';
  }

  if (toggleCallBtn) {
    toggleCallBtn.addEventListener('click', () => {
      if (isCallActive) {
        stopVoiceCall();
      } else {
        startVoiceCall();
      }
    });
  }
});
