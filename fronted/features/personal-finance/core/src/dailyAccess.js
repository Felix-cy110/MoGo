export const createDailyFinanceAccess = ({ selectedDate, todayDate }) => {
  const isToday = selectedDate === todayDate;
  return Object.freeze({
    isToday,
    canAddExpense: true,
    canSaveBudget: isToday,
    canManageCategories: isToday
  });
};

export const canEditExpenseForDay = ({ expense, selectedDate, todayDate }) =>
  selectedDate === todayDate || expense?.occurredAt?.slice(0, 10) === todayDate;
