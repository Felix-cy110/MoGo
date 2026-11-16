package com.mogo.personalfinance.controller;

import com.mogo.personalfinance.entity.ApiModels.ExpenseRequest;
import com.mogo.personalfinance.entity.ApiModels.ExpenseResponse;
import com.mogo.personalfinance.service.FinanceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
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
}
