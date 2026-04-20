package com.oppshan.files.file;

import jakarta.validation.constraints.NotNull;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

public record BreadcrumbView(
        @NotNull
        UUID uuid,

        String name
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;
}
