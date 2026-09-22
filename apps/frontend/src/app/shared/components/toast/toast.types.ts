export type ToastVariant = 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}
