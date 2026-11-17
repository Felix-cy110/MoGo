import React, { useEffect, useRef } from 'react';

export function CategoryNoticeDialog({ t, messageKey, onDismiss }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const open = Boolean(messageKey);
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [messageKey]);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%_-_2.5rem)] max-w-sm border border-slate-300 bg-white p-5 text-slate-900 shadow-lg backdrop:bg-black/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      role="alertdialog"
      aria-labelledby="category-notice-title"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      <h2 id="category-notice-title" className="text-base font-medium">{messageKey ? t(messageKey) : null}</h2>
      <button className="button-secondary mt-4 w-full" type="button" autoFocus onClick={onDismiss}>{t('confirm')}</button>
    </dialog>
  );
}
