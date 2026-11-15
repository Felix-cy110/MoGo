package com.mogo.finance.entity;

import java.util.List;

public record DashboardView(String date, boolean budgetSet, long budgetAmountCents,
                           long totalAmountCents, long remainingAmountCents,
                           int usagePercent, int expenseCount,
                           List<CategoryTotal> categoryTotals, List<ExpenseView> expenses) {
    public record CategoryTotal(Long categoryId, String categoryCode, String categoryName,
                                long amountCents, int expenseCount) {}
}
