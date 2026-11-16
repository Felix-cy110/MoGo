package com.mogo.personalfinance.repository;

import com.mogo.personalfinance.entity.ExpenseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExpenseRepository extends JpaRepository<ExpenseEntity, Long> {
    List<ExpenseEntity> findByExpenseDateOrderByOccurredAtDescIdDesc(LocalDate date);
    Optional<ExpenseEntity> findByClientRequestId(String requestId);

    @Query("select coalesce(sum(e.amountCents), 0) from ExpenseEntity e where e.expenseDate = :date")
    long sumAmountByDate(@Param("date") LocalDate date);
}
