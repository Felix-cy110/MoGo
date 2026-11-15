package com.mogo.finance.repository;

import com.mogo.finance.entity.DailyBudgetEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface DailyBudgetRepository extends JpaRepository<DailyBudgetEntity, Long> {
    Optional<DailyBudgetEntity> findByBudgetDate(LocalDate date);
}
