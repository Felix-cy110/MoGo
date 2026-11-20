export const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const shiftLocalDate = (date, days) => {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year, month - 1, day, 12);
  value.setDate(value.getDate() + days);
  return formatLocalDate(value);
};
