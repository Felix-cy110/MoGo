package com.mogo.finance.repository;

import com.mogo.finance.entity.ExpenseCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategoryEntity, Long> {
    List<ExpenseCategoryEntity> findByActiveTrueOrderBySortOrderAscIdAsc();
    Optional<ExpenseCategoryEntity> findByCode(String code);
}
