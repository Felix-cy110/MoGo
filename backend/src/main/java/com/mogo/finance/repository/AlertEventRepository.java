package com.mogo.finance.repository;

import com.mogo.finance.entity.AlertEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertEventRepository extends JpaRepository<AlertEventEntity, Long> {}
