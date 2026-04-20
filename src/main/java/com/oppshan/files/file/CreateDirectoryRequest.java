package com.oppshan.files.file;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateDirectoryRequest(
        @NotEmpty
        @Size(max = 255)
        String name,

        @NotNull
        UUID parentUuid
) {
}