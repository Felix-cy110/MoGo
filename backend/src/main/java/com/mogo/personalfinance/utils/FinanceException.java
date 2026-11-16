package com.mogo.personalfinance.utils;

import org.springframework.http.HttpStatus;

public class FinanceException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public FinanceException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
