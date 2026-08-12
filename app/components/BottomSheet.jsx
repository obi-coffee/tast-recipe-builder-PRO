import { useEffect, useRef } from 'react';

/**
 * Mobile-style bottom sheet. Slides up from the bottom over a dimmed backdrop,
 * the standard pattern for menus on a phone. Tapping the backdrop or the close
 * button (or pressing Esc) dismisses it. Respects the phone's bottom safe area.
 *
 * Accessible: focus moves into the sheet on open, Tab is trapped within it, and
 * focus returns to whatever was focused before, on close.
 */
export default function BottomSheet({ title, onClose, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const restoreTo = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () => Array.from(
      panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    ).filter(el => el.offsetParent !== null);

    // Move focus into the sheet (first field if any, else the panel itself).
    const first = focusables()[0];
    (first || panelRef.current)?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) { e.preventDefault(); return; }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      try { restoreTo && restoreTo.focus && restoreTo.focus(); } catch {}
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <span className="eyebrow">{title}</span>
          <button onClick={onClose} aria-label="Close" className="sheet-close">×</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
