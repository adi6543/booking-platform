const { runScheduledSlotGeneration } = require('./slotGenerator');
const { releaseExpiredHolds } = require('./bookingCleanup');

let intervalId = null;
let cleanupIntervalId = null;

function initScheduler() {
  console.log('⏰ Slot scheduler initialized: maintaining rolling 14-day window and walk-in auto-unblocks.');

  // Run cleanup of holds & expired pauses every 2 minutes
  cleanupIntervalId = setInterval(async () => {
    try {
      await releaseExpiredHolds();
    } catch (err) {
      console.error('Scheduler hold cleanup error:', err);
    }
  }, 2 * 60 * 1000);

  // Run rolling-window slot generation every 12 hours
  intervalId = setInterval(async () => {
    try {
      const generated = await runScheduledSlotGeneration(14);
      if (generated > 0) {
        console.log(`⏰ Scheduled generation: added ${generated} new rolling slots.`);
      }
    } catch (err) {
      console.error('Scheduled slot generation error:', err);
    }
  }, 12 * 60 * 60 * 1000);

  // Run initial pass on startup
  setTimeout(async () => {
    try {
      await releaseExpiredHolds();
      await runScheduledSlotGeneration(14);
    } catch (_) {}
  }, 3000);
}

function stopScheduler() {
  if (intervalId) clearInterval(intervalId);
  if (cleanupIntervalId) clearInterval(cleanupIntervalId);
}

module.exports = { initScheduler, stopScheduler };
