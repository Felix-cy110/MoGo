package com.mogo.finance.service;

import com.mogo.finance.entity.*;
import com.mogo.finance.entity.ApiModels.BudgetRequest;
import com.mogo.finance.entity.ApiModels.ExpenseRequest;
import com.mogo.finance.entity.ApiModels.ExpenseResponse;

import java.time.LocalDate;
import java.util.List;

public interface FinanceService {
    List<ExpenseCategoryView> getCategories();
    DashboardView getDashboard(LocalDate date);
    DailyBudgetEntity saveBudget(BudgetRequest request);
    ExpenseResponse addExpense(ExpenseRequest request);
}
