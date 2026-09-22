import { Injectable, signal } from '@angular/core';
import { Toast, ToastVariant } from '../../shared/components/toast/toast.types';

const DEFAULT_DURATION_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Stack attivo — il container toast legge questo signal. */
  readonly toasts = signal<Toast[]>([]);

  success(message: string, durationMs = DEFAULT_DURATION_MS): void {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = DEFAULT_DURATION_MS): void {
    this.show(message, 'error', durationMs);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  private show(message: string, variant: ToastVariant, durationMs: number): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, variant }]);

    if (durationMs > 0) {
      const timer = setTimeout(() => this.dismiss(id), durationMs);
      this.timers.set(id, timer);
    }
  }
}
