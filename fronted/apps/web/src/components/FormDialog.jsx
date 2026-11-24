import React, { useEffect, useId, useRef } from 'react';

export function FormDialog({ open, title, onClose, busy = false, children }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);
  return (
    <dialog ref={dialogRef} aria-labelledby={titleId}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2.5rem)] max-w-md overflow-y-auto border border-slate-300 bg-white p-5 text-slate-900 backdrop:bg-black/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
      <h2 id={titleId} className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </dialog>
  );
}
