package com.oppshan.files.exception;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;

import java.io.Serial;
import java.io.Serializable;

@Valid
@RegisterForReflection
public record ErrorResponse(MessageCode messageCode) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}