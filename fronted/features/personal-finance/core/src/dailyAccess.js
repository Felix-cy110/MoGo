export const createDailyFinanceAccess = ({ selectedDate, todayDate }) => {
  const isToday = selectedDate === todayDate;
  return Object.freeze({
    isToday,
    canAddExpense: true,
    canSaveBudget: isToday,
    canEditExpense: isToday,
    canManageCategories: isToday
  });
};
