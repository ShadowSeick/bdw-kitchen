export class Batcher<T> {
  private buffer: T[];
  private maxWaitMs = 2000;
  private maxSize = 5;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private flush: (batch: T[]) => void,
    options?: { maxWaitMs: number; maxSize: number },
  ) {
    this.buffer = [];
    if (options) {
      this.maxSize = options.maxSize;
      this.maxWaitMs = options.maxWaitMs;
    }
  }

  add(item: T) {
    this.buffer.push(item);
    if (this.buffer.length >= this.maxSize) {
      this.flushNow();
    } else {
      this.scheduleFlush();
    }
  }

  flushNow() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = null;
    if (this.buffer.length === 0) {
      return;
    }
    this.flush(this.buffer.splice(0)); // drain and send
  }

  private scheduleFlush() {
    if (this.timer) {
      return;
    }

    this.timer = setTimeout(this.flushNow, this.maxWaitMs);
  }
}
