/** Synchronous lock: React state alone does not guard two events before a render. */
export function createSubmissionLock() {
  let busy = false;
  return {
    async run(action: () => Promise<void>): Promise<boolean> {
      if (busy) return false;
      busy = true;
      try { await action(); return true; }
      finally { busy = false; }
    },
  };
}
