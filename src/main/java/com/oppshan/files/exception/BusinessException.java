package com.oppshan.files.exception;

import java.io.Serial;

public class BusinessException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final MessageCode messageCode;

    protected BusinessException(MessageCode messageCode) {
        super(messageCode.getValue());
        this.messageCode = messageCode;
    }

    protected BusinessException(MessageCode messageCode, Throwable cause) {
        super(messageCode.getValue(), cause);
        this.messageCode = messageCode;
    }

    public static BusinessException authenticationRequired() {
        return new BusinessException(MessageCode.AUTHENTICATION_REQUIRED);
    }

    public static BusinessException storageCapacityExceeded() {
        return new BusinessException(MessageCode.STORAGE_CAPACITY_EXCEEDED);
    }

    public static BusinessException directoryNotFound() {
        return new BusinessException(MessageCode.DIRECTORY_NOT_FOUND);
    }

    public static BusinessException userNotFound() {
        return new BusinessException(MessageCode.USER_NOT_FOUND);
    }

    public MessageCode getErrorCode() {
        return messageCode;
    }
}
