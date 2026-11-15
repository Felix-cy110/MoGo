package com.mogo.finance.controller;

import com.mogo.finance.entity.ApiModels.BudgetRequest;
import com.mogo.finance.entity.DailyBudgetEntity;
import com.mogo.finance.service.FinanceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/budgets/daily")
public class BudgetController {
    private final FinanceService financeService;
    public BudgetController(FinanceService financeService) { this.financeService = financeService; }
    @PutMapping
    public BudgetResponse saveBudget(@Valid @RequestBody BudgetRequest request) {
        DailyBudgetEntity budget = financeService.saveBudget(request);
        return new BudgetResponse(budget.getBudgetDate().toString(), budget.getMaxAmountCents(), budget.getCurrencyCode());
    }
    public record BudgetResponse(String date, long amountCents, String currencyCode) {}
}
