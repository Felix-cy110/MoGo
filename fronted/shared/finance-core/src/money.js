export const yuanToCents = (value) => Math.round(Number(value || 0) * 100);

export const centsToYuan = (value) => (Number(value || 0) / 100).toFixed(2);

export const clampPercent = (value) => Math.min(Math.max(Number(value || 0), 0), 100);
