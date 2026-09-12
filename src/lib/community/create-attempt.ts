/** Keeps the exact request across an uncertain response; never stores credentials. */
export class CreateAttempt<T> {
  private request: { requestId: string; body: T } | null = null;

  get pending() { return this.request !== null; }

  begin(body: T) {
    this.request ??= { requestId: crypto.randomUUID(), body: structuredClone(body) };
    return structuredClone(this.request);
  }

  resolved() { this.request = null; }

  rejected(status: number) {
    // Network/server/timeouts and authentication recovery do not tell us whether
    // the first request committed. A definitive validation/conflict response does.
    if (status >= 400 && status < 500 && ![401, 403, 408, 429].includes(status)) this.resolved();
  }
}
