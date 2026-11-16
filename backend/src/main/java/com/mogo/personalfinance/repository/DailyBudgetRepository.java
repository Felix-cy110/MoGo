package com.mogo.personalfinance.repository;

import com.mogo.personalfinance.entity.DailyBudgetEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface DailyBudgetRepository extends JpaRepository<DailyBudgetEntity, Long> {
    Optional<DailyBudgetEntity> findByBudgetDate(LocalDate date);
}
