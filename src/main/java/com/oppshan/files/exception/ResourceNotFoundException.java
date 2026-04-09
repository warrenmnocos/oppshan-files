package com.oppshan.files.exception;

import java.io.Serial;

public class ResourceNotFoundException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final MessageCode messageCode;

    public ResourceNotFoundException(MessageCode messageCode) {
        super(messageCode.getValue());
        this.messageCode = messageCode;
    }

    public MessageCode getErrorCode() {
        return messageCode;
    }
}
