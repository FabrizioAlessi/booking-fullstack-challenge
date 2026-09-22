import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { Toast } from './toast.types';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div
      class="pointer-events-none fixed right-4 top-4 flex w-full max-w-sm flex-col gap-2"
      style="z-index: 60"
      aria-live="polite"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          [class]="toastClasses(toast)"
          [attr.role]="toast.variant === 'error' ? 'alert' : 'status'"
        >
          <p class="m-0 flex-1 text-sm font-medium leading-snug">{{ toast.message }}</p>
          <button
            type="button"
            class="shrink-0 rounded border-0 bg-transparent p-0.5 font-inherit text-current opacity-60 cursor-pointer hover:opacity-100"
            aria-label="Chiudi"
            (click)="toastService.dismiss(toast.id)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="size-4"
              aria-hidden="true"
            >
              <path
                d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
              />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  toastClasses(toast: Toast): string {
    const base =
      'pointer-events-auto flex items-start gap-3 rounded-lg border px-3.5 py-3 shadow-md';
    if (toast.variant === 'success') {
      return `${base} border-success bg-success-soft text-success`;
    }
    return `${base} border-danger-200 bg-danger-50 text-danger-700`;
  }
}
