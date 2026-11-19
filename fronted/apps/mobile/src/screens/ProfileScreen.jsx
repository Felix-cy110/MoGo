import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@mogo/user-profile-react';
import { genderOptions } from '@mogo/user-profile-core';
import {
  Action,
  Field,
  Label,
  Loading,
  Page,
  Section,
} from '../components/Primitives';
import ChoiceField from '../components/ChoiceField';
import useFeedback from '../components/useFeedback';
export default function ProfileScreen({ api }) {
  const model = useUserProfile({ api });
  const { t } = useTranslation();
  useFeedback(model.feedback, model.clearFeedback);
  if (model.loading) return <Loading />;
  if (!model.loaded)
    return (
      <Page>
        <Label>{t(model.feedback?.key || 'profileLoadFailed')}</Label>
        <Action title={t('profileRetry')} onPress={model.reload} />
      </Page>
    );
  const field = (name, key, numeric = false) => (
    <Field
      key={name}
      label={t(key)}
      value={model.draft[name]}
      onChangeText={value => model.updateField(name, value)}
      numeric={numeric}
      placeholder={t('profileOptional')}
      editable={!model.saving}
    />
  );
  return (
    <Page>
      <Section>
        {field('name', 'profileName')}
        <ChoiceField
          disabled={model.saving}
          label={t('profileGender')}
          value={model.draft.gender}
          onChange={value => model.updateField('gender', value)}
          options={[
            { value: '', label: t('profileGenderUnset') },
            ...genderOptions.map(value => ({
              value,
              label: t(`profileGender${value}`),
            })),
          ]}
        />
        {field('age', 'profileAge', true)}
        {field('country', 'profileCountry')}
        {field('occupation', 'profileOccupation')}
        {field('monthlyIncome', 'profileMonthlyIncome', true)}
        <Action
          title={t(model.saving ? 'profileSaving' : 'profileSave')}
          disabled={model.saving}
          onPress={model.save}
        />
      </Section>
    </Page>
  );
}
