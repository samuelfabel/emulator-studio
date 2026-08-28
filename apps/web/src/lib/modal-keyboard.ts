import { useEffect } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

type ModalKeyboardOptions = {
  open: boolean;
  busy?: boolean;
  primaryDisabled?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
};

/** Enter submits (primary), Escape cancels (secondary). Skips Enter inside textareas. */
export function useModalKeyboard({
  open,
  busy,
  primaryDisabled,
  onPrimary,
  onSecondary,
}: ModalKeyboardOptions): void {
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (busy) return;
        event.preventDefault();
        onSecondary?.();
        return;
      }

      if (event.key !== 'Enter' || event.shiftKey) return;
      if (busy || primaryDisabled) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.tagName === 'TEXTAREA') return;
      if (target.isContentEditable) return;

      event.preventDefault();
      onPrimary?.();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, primaryDisabled, onPrimary, onSecondary]);
}

/** Enter on a single-line field triggers an action (e.g. bucket name input). */
export function inlineEnterKey(
  event: ReactKeyboardEvent,
  action: () => void,
  disabled?: boolean
): void {
  if (event.key !== 'Enter' || disabled) return;
  if (event.target instanceof HTMLTextAreaElement) return;
  event.preventDefault();
  action();
}
