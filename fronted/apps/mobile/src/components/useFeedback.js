import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

// Native alerts provide focus isolation, screen-reader support, and system theme styling.
export default function useFeedback(feedback, dismiss) {
  const { t } = useTranslation();
  const last = useRef(null);
  useEffect(() => {
    if (
      !feedback ||
      feedback.presentation === 'inline' ||
      last.current === feedback
    )
      return;
    last.current = feedback;
    Alert.alert(
      t(feedback.key),
      '',
      [{ text: t('confirm'), onPress: dismiss }],
      { cancelable: false },
    );
  }, [feedback, dismiss, t]);
}
