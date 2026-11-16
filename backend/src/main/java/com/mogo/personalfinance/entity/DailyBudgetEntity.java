package com.mogo.personalfinance.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_budgets")
public class DailyBudgetEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "budget_date", nullable = false, unique = true)
    private LocalDate budgetDate;

    @Column(name = "max_amount_cents", nullable = false)
    private long maxAmountCents;

    @Column(name = "currency_code", nullable = false, length = 8)
    private String currencyCode = "CNY";

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public LocalDate getBudgetDate() { return budgetDate; }
    public void setBudgetDate(LocalDate budgetDate) { this.budgetDate = budgetDate; }
    public long getMaxAmountCents() { return maxAmountCents; }
    public void setMaxAmountCents(long maxAmountCents) { this.maxAmountCents = maxAmountCents; }
    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
}
