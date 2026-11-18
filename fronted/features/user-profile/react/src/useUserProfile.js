import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildProfilePayload, createProfileDraft, resolveProfileErrorKey, validateProfileDraft
} from '@mogo/user-profile-core';

export const useUserProfile = ({ api }) => {
  const [draft, setDraft] = useState(createProfileDraft);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const loadSequence = useRef(0);
  const savingRef = useRef(false);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoaded(false);
    setFeedback(null);
    try {
      const profile = await api.getProfile();
      if (sequence !== loadSequence.current) return;
      setDraft(createProfileDraft(profile));
      setLoaded(true);
    } catch (error) {
      if (sequence === loadSequence.current) {
        setFeedback({ type: 'error', key: resolveProfileErrorKey(error.code, 'profileLoadFailed') });
      }
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
    return () => { ++loadSequence.current; };
  }, [load]);

  const updateField = useCallback((field, value) => {
    setDraft(current => ({ ...current, [field]: value }));
    setFeedback(null);
  }, []);

  const save = useCallback(async () => {
    if (!loaded || savingRef.current) return false;
    setFeedback(null);
    const key = validateProfileDraft(draft);
    if (key) {
      setFeedback({ type: 'error', key });
      return false;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const profile = await api.saveProfile(buildProfilePayload(draft));
      setDraft(createProfileDraft(profile));
      setFeedback({ type: 'success', key: 'profileSaved' });
      return true;
    } catch (error) {
      setFeedback({ type: 'error', key: resolveProfileErrorKey(error.code) });
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [api, draft, loaded]);

  return { draft, loading, loaded, saving, feedback, updateField, save, reload: load };
};
