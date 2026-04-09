package com.oppshan.files.exception;

import java.io.Serial;

public class BusinessException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final MessageCode messageCode;

    public BusinessException(MessageCode messageCode) {
        super(messageCode.getValue());
        this.messageCode = messageCode;
    }

    public BusinessException(MessageCode messageCode, Throwable cause) {
        super(messageCode.getValue(), cause);
        this.messageCode = messageCode;
    }

    public static BusinessException storageCapacityExceeded() {
        return new BusinessException(MessageCode.STORAGE_CAPACITY_EXCEEDED);
    }

    public MessageCode getErrorCode() {
        return messageCode;
    }
}
