export class Scheduler {
  #timer = null;
  #running = false;

  constructor() {}

  start(intervalMs, callback) {
    if (this.#running) this.stop();
    this.#running = true;

    // Run immediately
    Promise.resolve().then(() => callback()).catch(() => {});

    this.#timer = setInterval(() => {
      callback().catch(() => {});
    }, intervalMs);
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
