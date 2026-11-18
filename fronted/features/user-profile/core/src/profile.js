export const genderOptions = Object.freeze(['MALE', 'FEMALE', 'OTHER']);
const maximumMonthlyIncomeCents = 99_999_999_999;

const centsToInput = (value) => value == null ? '' : (Number(value) / 100).toFixed(2);

const incomeToCents = (value) => {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
};

export const createProfileDraft = (profile = {}) => ({
  name: profile.name ?? '',
  gender: profile.gender ?? '',
  age: profile.age == null ? '' : String(profile.age),
  country: profile.country ?? '',
  occupation: profile.occupation ?? '',
  monthlyIncome: centsToInput(profile.monthlyIncomeCents)
});

export const validateProfileDraft = (draft) => {
  for (const field of ['name', 'country', 'occupation']) {
    if ([...draft[field].trim()].length > 100) return 'profileTextTooLong';
  }
  if (draft.gender && !genderOptions.includes(draft.gender)) return 'profileGenderInvalid';
  const age = draft.age.trim();
  if (age && (!/^\d+$/.test(age) || Number(age) > 150)) return 'profileAgeInvalid';
  const monthlyIncome = draft.monthlyIncome.trim();
  const monthlyIncomeCents = monthlyIncome ? incomeToCents(monthlyIncome) : null;
  if (monthlyIncome && (monthlyIncomeCents == null || monthlyIncomeCents > maximumMonthlyIncomeCents)) return 'profileMonthlyIncomeInvalid';
  return null;
};

export const buildProfilePayload = (draft) => ({
  name: draft.name.trim() || null,
  gender: draft.gender || null,
  age: draft.age.trim() ? Number(draft.age.trim()) : null,
  country: draft.country.trim() || null,
  occupation: draft.occupation.trim() || null,
  monthlyIncomeCents: draft.monthlyIncome.trim() ? incomeToCents(draft.monthlyIncome) : null
});

const errorKeys = Object.freeze({
  PROFILE_AGE_INVALID: 'profileAgeInvalid',
  PROFILE_MONTHLY_INCOME_INVALID: 'profileMonthlyIncomeInvalid',
  PROFILE_GENDER_INVALID: 'profileGenderInvalid',
  PROFILE_TEXT_TOO_LONG: 'profileTextTooLong',
  PROFILE_READ_FAILED: 'profileReadFailed',
  PROFILE_WRITE_FAILED: 'profileWriteFailed',
  PROFILE_VERSION_UNSUPPORTED: 'profileVersionUnsupported',
  VALIDATION_ERROR: 'profileValidationError'
});

export const resolveProfileErrorKey = (code, fallback = 'profileSaveFailed') => errorKeys[code] || fallback;
