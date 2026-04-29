package com.oppshan.files.file;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.io.Serial;
import java.io.Serializable;

@Valid
@RegisterForReflection
public record RenameFileNodeRequest(
        @NotEmpty
        @Size(max = 255)
        String name
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}
