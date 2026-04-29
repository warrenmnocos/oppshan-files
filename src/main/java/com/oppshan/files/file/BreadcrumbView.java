package com.oppshan.files.file;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

@Valid
@RegisterForReflection
public record BreadcrumbView(
        @NotNull
        UUID uuid,

        String name
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}
