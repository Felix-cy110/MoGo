package com.mogo.personalfinance.repository;

import com.mogo.personalfinance.entity.AlertEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertEventRepository extends JpaRepository<AlertEventEntity, Long> {}
