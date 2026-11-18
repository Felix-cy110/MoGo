import React, { useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createProfileApi, genderOptions } from '@mogo/user-profile-core';
import { useUserProfile } from '@mogo/user-profile-react';
import { AppControls } from '../../components/AppControls';
import { FormFieldRow } from '../../components/FormFieldRow';
import { NoticeDialog } from '../../components/NoticeDialog';

const api = createProfileApi({ baseUrl: '/api' });

export function UserProfileScreen({ onBack }) {
  const { t } = useTranslation();
  const profile = useUserProfile({ api });
  const dialogFeedback = profile.feedback?.presentation === 'dialog';

  useEffect(() => {
    document.title = `${t('userProfile')} · MoGo`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('userProfile'));
  }, [t]);

  const submit = async (event) => {
    event.preventDefault();
    await profile.save();
  };

  const textField = (field, label, autoComplete) => (
    <FormFieldRow label={t(label)} htmlFor={`profile-${field}`}>
      <input
        id={`profile-${field}`}
        className="field form-row-field"
        type="text"
        autoComplete={autoComplete}
        value={profile.draft[field]}
        onChange={event => profile.updateField(field, event.target.value)}
        placeholder={t('profileOptional')}
      />
    </FormFieldRow>
  );

  return (
    <main className="min-h-screen bg-white text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <button className="back-button" type="button" onClick={onBack} aria-label={t('backToToolbox')} title={t('backToToolbox')}>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <h1 className="text-lg font-semibold">{t('userProfile')}</h1>
          </div>
          <AppControls />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-6">
        {profile.loading && <p className="section-label" role="status">{t('profileLoading')}</p>}
        {profile.feedback && !dialogFeedback && (
          <div className={`notice notice-${profile.feedback.type}`} role={profile.feedback.type === 'error' ? 'alert' : 'status'}>
            {t(profile.feedback.key)}
          </div>
        )}
        {!profile.loading && !profile.loaded && (
          <button className="button-secondary" type="button" onClick={profile.reload}>{t('profileRetry')}</button>
        )}
        {profile.loaded && (
          <form noValidate onSubmit={submit}>
            <fieldset disabled={profile.saving} className="min-w-0 border-0 p-0 disabled:opacity-60">
              <div className="form-sheet">
                {textField('name', 'profileName', 'name')}
                <FormFieldRow label={t('profileGender')} htmlFor="profile-gender">
                  <select id="profile-gender" className="field form-row-field" value={profile.draft.gender} onChange={event => profile.updateField('gender', event.target.value)}>
                    <option value="">{t('profileGenderUnset')}</option>
                    {genderOptions.map(gender => <option key={gender} value={gender}>{t(`profileGender${gender}`)}</option>)}
                  </select>
                </FormFieldRow>
                <FormFieldRow label={t('profileAge')} htmlFor="profile-age">
                  <input id="profile-age" className="field form-row-field" type="number" inputMode="numeric" min="0" max="150" step="1" value={profile.draft.age} onChange={event => profile.updateField('age', event.target.value)} placeholder={t('profileOptional')} />
                </FormFieldRow>
                {textField('country', 'profileCountry', 'country-name')}
                {textField('occupation', 'profileOccupation', 'organization-title')}
              </div>
              <div className="mt-5 flex justify-end">
                <button className="button-primary inline-flex min-w-24 items-center justify-center gap-2" type="submit" disabled={profile.saving}>
                  <Save size={16} aria-hidden="true" />
                  {t(profile.saving ? 'profileSaving' : 'profileSave')}
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </div>
      <NoticeDialog
        title={dialogFeedback ? t(profile.feedback.key) : null}
        confirmLabel={t('confirm')}
        titleId="profile-notice-title"
        onDismiss={profile.clearFeedback}
      />
    </main>
  );
}
