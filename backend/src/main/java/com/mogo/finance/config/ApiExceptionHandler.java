package com.mogo.finance.config;

import com.mogo.finance.entity.ApiModels.ApiError;
import com.mogo.finance.utils.FinanceException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(FinanceException.class)
    ResponseEntity<ApiError> handleFinanceException(FinanceException exception) {
        return ResponseEntity.status(exception.getStatus())
                .body(new ApiError(exception.getCode(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_ERROR", "请检查提交的数据"));
    }
}
