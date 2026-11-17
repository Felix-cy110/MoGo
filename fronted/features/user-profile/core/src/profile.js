export const genderOptions = Object.freeze(['MALE', 'FEMALE', 'OTHER']);

export const createProfileDraft = (profile = {}) => ({
  name: profile.name ?? '',
  gender: profile.gender ?? '',
  age: profile.age == null ? '' : String(profile.age),
  country: profile.country ?? '',
  occupation: profile.occupation ?? ''
});

export const validateProfileDraft = (draft) => {
  for (const field of ['name', 'country', 'occupation']) {
    if ([...draft[field].trim()].length > 100) return 'profileTextTooLong';
  }
  if (draft.gender && !genderOptions.includes(draft.gender)) return 'profileGenderInvalid';
  const age = draft.age.trim();
  if (age && (!/^\d+$/.test(age) || Number(age) > 150)) return 'profileAgeInvalid';
  return null;
};

export const buildProfilePayload = (draft) => ({
  name: draft.name.trim() || null,
  gender: draft.gender || null,
  age: draft.age.trim() ? Number(draft.age.trim()) : null,
  country: draft.country.trim() || null,
  occupation: draft.occupation.trim() || null
});

const errorKeys = Object.freeze({
  PROFILE_AGE_INVALID: 'profileAgeInvalid',
  PROFILE_GENDER_INVALID: 'profileGenderInvalid',
  PROFILE_TEXT_TOO_LONG: 'profileTextTooLong',
  PROFILE_READ_FAILED: 'profileReadFailed',
  PROFILE_WRITE_FAILED: 'profileWriteFailed',
  PROFILE_VERSION_UNSUPPORTED: 'profileVersionUnsupported',
  VALIDATION_ERROR: 'profileValidationError'
});

export const resolveProfileErrorKey = (code, fallback = 'profileSaveFailed') => errorKeys[code] || fallback;
