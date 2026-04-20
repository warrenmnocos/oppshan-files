package com.oppshan.files.file;

import jakarta.validation.constraints.PositiveOrZero;

import java.io.Serial;
import java.io.Serializable;

public record DirectoryStatistics(
        @PositiveOrZero
        long folderCount,

        @PositiveOrZero
        long fileCount,

        @PositiveOrZero
        long totalSizeBytes
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private static final DirectoryStatistics empty = new DirectoryStatistics(0, 0, 0);

    public static DirectoryStatistics empty() {
        return empty;
    }
}
