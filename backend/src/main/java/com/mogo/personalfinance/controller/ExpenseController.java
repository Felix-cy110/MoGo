package com.mogo.personalfinance.controller;

import com.mogo.personalfinance.entity.ApiModels.ExpenseRequest;
import com.mogo.personalfinance.entity.ApiModels.ExpenseResponse;
import com.mogo.personalfinance.entity.ApiModels.ExpenseUpdateRequest;
import com.mogo.personalfinance.service.FinanceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {
    private final FinanceService financeService;
    public ExpenseController(FinanceService financeService) { this.financeService = financeService; }
    @PostMapping
    public ExpenseResponse addExpense(@Valid @RequestBody ExpenseRequest request) {
        return financeService.addExpense(request);
    }

    @PutMapping("/{expenseId}")
    public ExpenseResponse updateExpense(@PathVariable Long expenseId,
                                         @Valid @RequestBody ExpenseUpdateRequest request) {
        return financeService.updateExpense(expenseId, request);
    }
}
