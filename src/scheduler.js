export class Scheduler {
  #timer = null;
  #running = false;
  #busy = false;

  constructor() {}

  start(intervalMs, callback) {
    if (this.#running) this.stop();
    this.#running = true;

    const run = async () => {
      if (this.#busy) return;
      this.#busy = true;
      try {
        await callback();
      } catch (err) {
        console.error('[scheduler] Task failed:', err.message);
      } finally {
        this.#busy = false;
      }
    };

    // Run immediately
    Promise.resolve().then(run);

    this.#timer = setInterval(run, intervalMs);
  }

  stop() {
    if (this.#timer) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    this.#running = false;
  }

  get isRunning() {
    return this.#running;
  }
}
