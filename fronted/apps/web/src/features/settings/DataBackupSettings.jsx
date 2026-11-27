import React, { useRef, useState } from 'react';
import { BACKUP_CONFLICT_POLICY, backupErrorKey } from '@mogo/core-shared';
import { Download, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FormDialog } from '../../components/FormDialog';
import { FormFieldRow } from '../../components/FormFieldRow';
import { NoticeDialog } from '../../components/NoticeDialog';

const MAX_BACKUP_FILE_SIZE = 350 * 1024 * 1024;

const emptyDraft = () => ({
  password: '',
  confirmation: '',
  conflictPolicy: BACKUP_CONFLICT_POLICY.OVERWRITE,
  file: null,
});

export function DataBackupSettings({ api }) {
  const { t } = useTranslation();
  const fileInput = useRef(null);
  const [mode, setMode] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const [notice, setNotice] = useState(null);
  const update = (field, value) => setDraft(current => ({ ...current, [field]: value }));
  const close = () => {
    if (busy) return;
    setMode(null);
    setDraft(emptyDraft());
    setErrorKey(null);
    if (fileInput.current) fileInput.current.value = '';
  };
  const open = nextMode => {
    setMode(nextMode);
    setDraft(emptyDraft());
    setErrorKey(null);
  };
  const validatePassword = requireConfirmation => {
    if (draft.password.length < 8) return 'backupPasswordTooShort';
    if (requireConfirmation && draft.password !== draft.confirmation) return 'backupPasswordMismatch';
    return null;
  };
  const exportData = async event => {
    event.preventDefault();
    const validation = validatePassword(true);
    if (validation) return setErrorKey(validation);
    setBusy(true);
    setErrorKey(null);
    try {
      const result = await api.exportData(draft.password);
      const url = URL.createObjectURL(new Blob([result.content], { type: 'application/vnd.mogo.backup' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      close();
      setNotice({ key: 'backupExported', reload: false });
    } catch (error) {
      setErrorKey(backupErrorKey(error, 'backupExportFailed'));
    } finally {
      setBusy(false);
    }
  };
  const importData = async event => {
    event.preventDefault();
    if (!draft.file) return setErrorKey('backupFileRequired');
    if (draft.file.size > MAX_BACKUP_FILE_SIZE) return setErrorKey('backupFileTooLarge');
    const validation = validatePassword(false);
    if (validation) return setErrorKey(validation);
    setBusy(true);
    setErrorKey(null);
    try {
      const result = await api.importData({
        content: await draft.file.text(),
        password: draft.password,
        conflictPolicy: draft.conflictPolicy,
      });
      const imported = result.databaseImported || result.profileImported;
      close();
      setNotice({ key: imported ? 'backupImported' : 'backupKeptExisting', reload: imported });
    } catch (error) {
      setErrorKey(backupErrorKey(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="section-label mb-3 mt-7">{t('dataManagement')}</p>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t('dataBackupDescription')}</p>
      <div className="form-sheet">
        <FormFieldRow label={t('exportData')} htmlFor="settings-export-data">
          <button id="settings-export-data" className="form-row-action grid size-9 place-items-center" type="button" onClick={() => open('export')} aria-label={t('exportData')} title={t('exportData')}>
            <Download size={18} aria-hidden="true" />
          </button>
        </FormFieldRow>
        <FormFieldRow label={t('importData')} htmlFor="settings-import-data">
          <button id="settings-import-data" className="form-row-action grid size-9 place-items-center" type="button" onClick={() => open('import')} aria-label={t('importData')} title={t('importData')}>
            <Upload size={18} aria-hidden="true" />
          </button>
        </FormFieldRow>
      </div>

      <FormDialog open={Boolean(mode)} title={t(mode === 'export' ? 'exportBackupTitle' : 'importBackupTitle')} onClose={close} busy={busy}>
        <form onSubmit={mode === 'export' ? exportData : importData}>
          {mode === 'import' && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium" htmlFor="backup-file">{t('backupFile')}</label>
              <input
                ref={fileInput}
                id="backup-file"
                type="file"
                accept=".mogo,application/vnd.mogo.backup"
                className="block w-full text-sm file:mr-3 file:border file:border-slate-300 file:bg-transparent file:px-3 file:py-2 file:text-sm dark:file:border-slate-600"
                onChange={event => update('file', event.target.files?.[0] || null)}
              />
            </div>
          )}
          <label className="mb-1 block text-sm font-medium" htmlFor="backup-password">{t('backupPassword')}</label>
          <input
            id="backup-password"
            className="field"
            type="password"
            autoComplete="new-password"
            value={draft.password}
            onChange={event => update('password', event.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('backupPasswordHint')}</p>
          {mode === 'export' && (
            <>
              <label className="mb-1 mt-4 block text-sm font-medium" htmlFor="backup-password-confirm">{t('backupPasswordConfirm')}</label>
              <input
                id="backup-password-confirm"
                className="field"
                type="password"
                autoComplete="new-password"
                value={draft.confirmation}
                onChange={event => update('confirmation', event.target.value)}
              />
            </>
          )}
          {mode === 'import' && (
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-medium">{t('conflictPolicy')}</legend>
              {[BACKUP_CONFLICT_POLICY.OVERWRITE, BACKUP_CONFLICT_POLICY.KEEP_EXISTING].map(policy => (
                <label key={policy} className="mb-2 flex min-h-11 cursor-pointer items-center gap-3 border border-slate-200 px-3 dark:border-slate-700">
                  <input
                    type="radio"
                    name="backup-conflict-policy"
                    checked={draft.conflictPolicy === policy}
                    onChange={() => update('conflictPolicy', policy)}
                  />
                  <span className="text-sm">{t(policy === BACKUP_CONFLICT_POLICY.OVERWRITE ? 'overwriteExistingData' : 'keepExistingData')}</span>
                </label>
              ))}
              {draft.conflictPolicy === BACKUP_CONFLICT_POLICY.KEEP_EXISTING && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('keepExistingDataHint')}</p>
              )}
            </fieldset>
          )}
          {errorKey && <p className="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">{t(errorKey)}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button className="button-secondary" type="button" disabled={busy} onClick={close}>{t('cancel')}</button>
            <button className="button-primary" type="submit" disabled={busy}>{t(mode === 'export' ? 'confirmExport' : 'confirmImport')}</button>
          </div>
        </form>
      </FormDialog>
      <NoticeDialog
        title={notice ? t(notice.key) : null}
        confirmLabel={t('confirm')}
        onDismiss={() => {
          const reload = notice?.reload;
          setNotice(null);
          if (reload) globalThis.location?.reload();
        }}
        titleId="backup-notice-title"
      />
    </>
  );
}
