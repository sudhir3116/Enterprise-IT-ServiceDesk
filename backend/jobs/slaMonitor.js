const slaService = require("../services/slaService");
const cron = require("node-cron");

let cronTask = null;

function startSlaMonitor() {
  console.log("⏰ [SLA Monitor Job] Initializing background SLA breach monitoring (every 15 minutes)...");

  slaService.evaluateBreaches().catch(err => {
    console.error("⏰ [SLA Monitor Job] Initial breach evaluation failed:", err.message);
  });

  if (!cronTask) {
    cronTask = cron.schedule("*/15 * * * *", () => {
      slaService.evaluateBreaches().catch(err => {
        console.error("⏰ [SLA Monitor Job] Scheduled breach evaluation failed:", err.message);
      });
    });
  }
}

function stopSlaMonitor() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log("⏰ [SLA Monitor Job] Stopped background monitoring timer.");
  }
}

module.exports = { startSlaMonitor, stopSlaMonitor };
