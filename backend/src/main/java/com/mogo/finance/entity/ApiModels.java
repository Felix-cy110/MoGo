package com.mogo.finance.entity;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.util.List;

public final class ApiModels {
    private ApiModels() {}

    public record BudgetRequest(@NotNull LocalDate date, @Positive long amountCents) {}

    public record ExpenseRequest(@NotNull LocalDate date, @Positive long amountCents,
                                 @NotNull Long categoryId, String note, String clientRequestId) {}

    public record ExpenseResponse(ExpenseView expense, long totalAmountCents,
                                  long budgetAmountCents, long remainingAmountCents,
                                  int usagePercent, List<AlertView> alerts) {}

    public record ApiError(String code, String message) {}
}
