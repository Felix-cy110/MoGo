package com.mogo.personalfinance.service;

import com.mogo.personalfinance.entity.*;
import com.mogo.personalfinance.entity.ApiModels.BudgetRequest;
import com.mogo.personalfinance.entity.ApiModels.CategoryRequest;
import com.mogo.personalfinance.entity.ApiModels.ExpenseRequest;
import com.mogo.personalfinance.entity.ApiModels.ExpenseResponse;

import java.time.LocalDate;
import java.util.List;

public interface FinanceService {
    List<ExpenseCategoryView> getCategories();
    ExpenseCategoryView addCategory(CategoryRequest request);
    DashboardView getDashboard(LocalDate date);
    DailyBudgetEntity saveBudget(BudgetRequest request);
    ExpenseResponse addExpense(ExpenseRequest request);
}
