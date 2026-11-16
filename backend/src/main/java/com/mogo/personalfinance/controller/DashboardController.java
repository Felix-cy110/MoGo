package com.mogo.personalfinance.controller;

import com.mogo.personalfinance.entity.DashboardView;
import com.mogo.personalfinance.service.FinanceService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final FinanceService financeService;
    public DashboardController(FinanceService financeService) { this.financeService = financeService; }
    @GetMapping
    public DashboardView getDashboard(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return financeService.getDashboard(date);
    }
}
