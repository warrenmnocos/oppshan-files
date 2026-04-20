package com.oppshan.files.file;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record RenameDirectoryRequest(
        @NotEmpty
        @Size(max = 255)
        String name
) {
}