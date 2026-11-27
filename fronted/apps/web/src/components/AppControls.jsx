import React from 'react';
import { Settings, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AppControls({ onOpenProfile, onOpenSettings }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      {onOpenProfile && (
        <button className="theme-switcher" type="button" onClick={onOpenProfile} aria-label={t('userProfile')} title={t('userProfile')}>
          <UserRound size={18} aria-hidden="true" />
        </button>
      )}
      {onOpenSettings && (
        <button className="theme-switcher" type="button" onClick={onOpenSettings} aria-label={t('settings')} title={t('settings')}>
          <Settings size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
