import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  template: `
    <div
      [class]="
        overlay()
          ? 'flex items-center justify-center fixed inset-0 z-50 bg-background/60 backdrop-blur-sm'
          : 'flex items-center justify-center'
      "
      role="status"
      aria-busy="true"
      aria-label="Caricamento"
    >
      <span
        class="inline-block size-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500"
        aria-hidden="true"
      ></span>
    </div>
  `,
})
export class LoaderComponent {
  /** Se true, copre l’area visibile con un overlay semi-trasparente. */
  readonly overlay = input(false);
}
