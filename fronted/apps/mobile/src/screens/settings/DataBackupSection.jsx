import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  BACKUP_CONFLICT_POLICY,
  backupErrorKey,
} from '@mogo/core-shared';
import {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
} from '@react-native-documents/picker';
import Share from 'react-native-share';
import { useTranslation } from 'react-i18next';
import FormDialog from '../../components/FormDialog';
import { Action, Label, Row, Section } from '../../components/Primitives';
import { usePreferences } from '../../platform/PreferencesProvider';

const MAX_BACKUP_FILE_SIZE = 350 * 1024 * 1024;

export default function DataBackupSection({ api }) {
  const { t } = useTranslation();
  const { colors } = usePreferences();
  const [mode, setMode] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [file, setFile] = useState(null);
  const [conflictPolicy, setConflictPolicy] = useState(
    BACKUP_CONFLICT_POLICY.OVERWRITE,
  );
  const [busy, setBusy] = useState(false);
  const notify = key =>
    Alert.alert(t(key), '', [{ text: t('confirm') }], { cancelable: true });
  const close = () => {
    if (busy) return;
    setMode(null);
    setPassword('');
    setConfirmation('');
    setFile(null);
    setConflictPolicy(BACKUP_CONFLICT_POLICY.OVERWRITE);
  };
  const openImport = async () => {
    try {
      const [selected] = await pick({ type: types.allFiles, mode: 'import' });
      if (!selected.name?.toLowerCase().endsWith('.mogo')) return notify('backupFileRequired');
      if (selected.size != null && selected.size > MAX_BACKUP_FILE_SIZE) return notify('backupFileTooLarge');
      setFile(selected);
      setMode('import');
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      notify('backupRestoreFailed');
    }
  };
  const exportData = async () => {
    if (password.length < 8) return notify('backupPasswordTooShort');
    if (password !== confirmation) return notify('backupPasswordMismatch');
    setBusy(true);
    try {
      const exported = await api.exportData(password);
      const uri = await api.writeBackupFile(exported.fileName, exported.content);
      await Share.open({
        url: uri,
        type: 'application/vnd.mogo.backup',
        filename: exported.fileName,
        failOnCancel: false,
        saveToFiles: true,
        useInternalStorage: true,
      });
      setBusy(false);
      close();
      notify('backupExported');
    } catch (error) {
      setBusy(false);
      notify(error?.code ? backupErrorKey(error) : 'backupExportFailed');
    }
  };
  const importData = async () => {
    if (password.length < 8) return notify('backupPasswordTooShort');
    if (!file) return notify('backupFileRequired');
    setBusy(true);
    try {
      const content = await api.readBackupFile(file.uri);
      const result = await api.importData({
        content,
        password,
        conflictPolicy,
      });
      const imported = result.databaseImported || result.profileImported;
      setBusy(false);
      close();
      notify(imported ? 'backupImported' : 'backupKeptExisting');
    } catch (error) {
      setBusy(false);
      notify(backupErrorKey(error));
    }
  };

  return (
    <>
      <Section title={t('dataManagement')}>
        <Row
          label={t('exportData')}
          action={
            <Action
              compact
              title={t('exportData')}
              disabled={!api}
              onPress={() => setMode('export')}
            />
          }
        >
          <Label muted>{t('dataBackupDescription')}</Label>
        </Row>
        <Row
          label={t('importData')}
          action={
            <Action
              compact
              title={t('importData')}
              disabled={!api}
              onPress={openImport}
            />
          }
        >
          <Label muted>{t('conflictPolicy')}</Label>
        </Row>
      </Section>

      <FormDialog
        visible={Boolean(mode)}
        title={t(mode === 'export' ? 'exportBackupTitle' : 'importBackupTitle')}
        onClose={close}
      >
        {mode === 'import' && (
          <View style={styles.fieldBlock}>
            <Label muted>{t('backupFile')}</Label>
            <Label>{file?.name}</Label>
          </View>
        )}
        <View style={styles.fieldBlock}>
          <Label>{t('backupPassword')}</Label>
          <TextInput
            accessibilityLabel={t('backupPassword')}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: colors.text, borderColor: colors.line }]}
          />
          <Label muted style={styles.hint}>{t('backupPasswordHint')}</Label>
        </View>
        {mode === 'export' && (
          <View style={styles.fieldBlock}>
            <Label>{t('backupPasswordConfirm')}</Label>
            <TextInput
              accessibilityLabel={t('backupPasswordConfirm')}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={confirmation}
              onChangeText={setConfirmation}
              style={[styles.input, { color: colors.text, borderColor: colors.line }]}
            />
          </View>
        )}
        {mode === 'import' && (
          <View style={styles.fieldBlock}>
            <Label>{t('conflictPolicy')}</Label>
            {[
              BACKUP_CONFLICT_POLICY.OVERWRITE,
              BACKUP_CONFLICT_POLICY.KEEP_EXISTING,
            ].map(policy => (
              <Pressable
                key={policy}
                accessibilityRole="radio"
                accessibilityState={{ selected: conflictPolicy === policy }}
                onPress={() => setConflictPolicy(policy)}
                style={[styles.policy, { borderColor: colors.line }]}
              >
                <Label style={conflictPolicy === policy && styles.selected}>
                  {conflictPolicy === policy ? '● ' : '○ '}
                  {t(
                    policy === BACKUP_CONFLICT_POLICY.OVERWRITE
                      ? 'overwriteExistingData'
                      : 'keepExistingData',
                  )}
                </Label>
              </Pressable>
            ))}
            {conflictPolicy === BACKUP_CONFLICT_POLICY.KEEP_EXISTING && (
              <Label muted style={styles.hint}>{t('keepExistingDataHint')}</Label>
            )}
          </View>
        )}
        <View style={styles.actions}>
          <Action title={t('cancel')} disabled={busy} onPress={close} />
          <Action
            title={t(mode === 'export' ? 'confirmExport' : 'confirmImport')}
            disabled={busy}
            variant="primary"
            onPress={mode === 'export' ? exportData : importData}
          />
        </View>
      </FormDialog>
    </>
  );
}

const styles = StyleSheet.create({
  fieldBlock: { gap: 6, marginBottom: 16 },
  input: { minHeight: 44, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10 },
  hint: { fontSize: 12, lineHeight: 18 },
  policy: { minHeight: 48, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, marginTop: 8 },
  selected: { fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
