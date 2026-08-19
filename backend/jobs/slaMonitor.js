const slaService = require("../services/slaService");

let intervalHandle = null;

function startSlaMonitor(intervalMs = 60000) {
  console.log("⏰ [SLA Monitor Job] Initializing background SLA breach monitoring service...");

  // Run initial breach evaluation on startup
  slaService.evaluateBreaches();

  // Schedule periodic monitoring
  if (!intervalHandle) {
    intervalHandle = setInterval(() => {
      slaService.evaluateBreaches();
    }, intervalMs);
  }
}

function stopSlaMonitor() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log("⏰ [SLA Monitor Job] Stopped background monitoring timer.");
  }
}

module.exports = { startSlaMonitor, stopSlaMonitor };
