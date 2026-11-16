package com.mogo.finance.controller;

import com.mogo.finance.entity.ApiModels.CategoryRequest;
import com.mogo.finance.entity.ExpenseCategoryView;
import com.mogo.finance.service.FinanceService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {
    private final FinanceService financeService;

    public CategoryController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping
    public List<ExpenseCategoryView> getCategories() {
        return financeService.getCategories();
    }

    @PostMapping
    public ExpenseCategoryView addCategory(@Valid @RequestBody CategoryRequest request) {
        return financeService.addCategory(request);
    }
}
