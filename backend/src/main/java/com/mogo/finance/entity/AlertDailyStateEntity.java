package com.mogo.finance.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@IdClass(AlertDailyStateId.class)
@Table(name = "alert_daily_states")
public class AlertDailyStateEntity {
    @Id
    @Column(name = "budget_date")
    private LocalDate budgetDate;

    @Id
    @Column(name = "rule_id")
    private Long ruleId;

    @Column(name = "is_triggered", nullable = false)
    private boolean triggered;

    @Column(name = "last_total_cents", nullable = false)
    private long lastTotalCents;

    @Column(name = "last_expense_id")
    private Long lastExpenseId;

    @Column(name = "triggered_at")
    private LocalDateTime triggeredAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public LocalDate getBudgetDate() { return budgetDate; }
    public void setBudgetDate(LocalDate budgetDate) { this.budgetDate = budgetDate; }
    public Long getRuleId() { return ruleId; }
    public void setRuleId(Long ruleId) { this.ruleId = ruleId; }
    public boolean isTriggered() { return triggered; }
    public void setTriggered(boolean triggered) { this.triggered = triggered; }
    public long getLastTotalCents() { return lastTotalCents; }
    public void setLastTotalCents(long lastTotalCents) { this.lastTotalCents = lastTotalCents; }
    public Long getLastExpenseId() { return lastExpenseId; }
    public void setLastExpenseId(Long lastExpenseId) { this.lastExpenseId = lastExpenseId; }
    public LocalDateTime getTriggeredAt() { return triggeredAt; }
    public void setTriggeredAt(LocalDateTime triggeredAt) { this.triggeredAt = triggeredAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
