package com.oppshan.files.file;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

@Valid
@RegisterForReflection
public record CreateDirectoryRequest(
        @NotEmpty
        @Size(max = 255)
        String name,

        @NotNull
        UUID parentUuid
) {
}