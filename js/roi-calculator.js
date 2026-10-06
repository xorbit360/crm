/**
 * XORBIT 360 - Interactive ROI & Growth Calculator
 */

document.addEventListener('DOMContentLoaded', () => {
  const chatsSlider = document.getElementById('calcChatsSlider');
  const ticketSlider = document.getElementById('calcTicketSlider');
  const chatsValDisplay = document.getElementById('calcChatsVal');
  const ticketValDisplay = document.getElementById('calcTicketVal');

  const metricRevenue = document.getElementById('roiMetricRevenue');
  const metricHours = document.getElementById('roiMetricHours');
  const metricConversion = document.getElementById('roiMetricConversion');

  function calculateROI() {
    if (!chatsSlider || !ticketSlider) return;

    const chats = parseInt(chatsSlider.value, 10);
    const avgTicket = parseInt(ticketSlider.value, 10);

    // Actualizar labels de los sliders
    if (chatsValDisplay) chatsValDisplay.textContent = `${chats.toLocaleString()} chats/mes`;
    if (ticketValDisplay) ticketValDisplay.textContent = `$${avgTicket} USD`;

    // Fórmulas de cálculo de impacto Xorbit:
    // Tasa de recuperación de ventas con IA (+18% aprox)
    const extraSales = Math.round(chats * 0.08); 
    const extraRevenue = extraSales * avgTicket;
    
    // Ahorro de horas hombre (asumiendo 4 minutos por chat manual vs 100% resuelto por IA)
    const hoursSaved = Math.round((chats * 0.75 * 4) / 60);

    if (metricRevenue) metricRevenue.textContent = `+$${extraRevenue.toLocaleString()} USD`;
    if (metricHours) metricHours.textContent = `${hoursSaved.toLocaleString()} hrs`;
    if (metricConversion) metricConversion.textContent = `+38% Cierre`;
  }

  if (chatsSlider) chatsSlider.addEventListener('input', calculateROI);
  if (ticketSlider) ticketSlider.addEventListener('input', calculateROI);

  calculateROI();
});
