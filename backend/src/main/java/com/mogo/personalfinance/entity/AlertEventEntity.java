package com.mogo.personalfinance.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "alert_events", indexes = @Index(name = "idx_alert_events_date", columnList = "budget_date"))
public class AlertEventEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "budget_date", nullable = false)
    private LocalDate budgetDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rule_id", nullable = false)
    private AlertRuleEntity rule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id")
    private ExpenseEntity expense;

    @Column(name = "event_type", nullable = false, length = 40)
    private String eventType;

    @Column(name = "total_amount_cents", nullable = false)
    private long totalAmountCents;

    @Column(name = "budget_amount_cents", nullable = false)
    private long budgetAmountCents;

    @Column(name = "threshold_percent", nullable = false)
    private int thresholdPercent;

    @Column(name = "message_key", nullable = false, length = 120)
    private String messageKey;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }

    public void setBudgetDate(LocalDate budgetDate) { this.budgetDate = budgetDate; }
    public void setRule(AlertRuleEntity rule) { this.rule = rule; }
    public void setExpense(ExpenseEntity expense) { this.expense = expense; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public void setTotalAmountCents(long value) { this.totalAmountCents = value; }
    public void setBudgetAmountCents(long value) { this.budgetAmountCents = value; }
    public void setThresholdPercent(int value) { this.thresholdPercent = value; }
    public void setMessageKey(String value) { this.messageKey = value; }
}
