package com.oppshan.files.exception;

import java.io.Serial;
import java.io.Serializable;

public record ErrorResponse(MessageCode messageCode) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}