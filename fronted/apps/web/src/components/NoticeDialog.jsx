import React, { useEffect, useRef } from 'react';

export function NoticeDialog({ title, confirmLabel, onDismiss, titleId = 'notice-dialog-title' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const open = Boolean(title);
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [title]);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%_-_2.5rem)] max-w-sm border border-slate-300 bg-white p-5 text-slate-900 shadow-lg backdrop:bg-black/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      role="alertdialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      <h2 id={titleId} className="text-base font-medium">{title}</h2>
      <button className="button-secondary mt-4 w-full" type="button" autoFocus onClick={onDismiss}>{confirmLabel}</button>
    </dialog>
  );
}
