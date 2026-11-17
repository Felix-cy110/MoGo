import React, { useEffect, useRef } from 'react';

export function CategoryProtectionDialog({ t, open, onDismiss }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%_-_2.5rem)] max-w-sm border border-slate-300 bg-white p-6 text-slate-900 shadow-lg backdrop:bg-black/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      aria-labelledby="category-protection-title"
      aria-describedby="category-protection-description"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      <h2 id="category-protection-title" className="text-lg font-semibold">{t('categoryProtectedTitle')}</h2>
      <p id="category-protection-description" className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
        {t('categoryProtected')}
      </p>
      <button className="button-secondary mt-5 w-full" type="button" autoFocus onClick={onDismiss}>{t('confirm')}</button>
    </dialog>
  );
}
