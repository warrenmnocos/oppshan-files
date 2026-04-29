package com.oppshan.files.file;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;
import java.util.UUID;

@Valid
@RegisterForReflection
public record DirectoryContentsView(
        @NotNull
        UUID uuid,

        @NotEmpty
        String name,

        UUID parentUuid,

        @NotNull
        List<@NotNull BreadcrumbView> breadcrumbViews,

        @NotNull
        List<@NotNull FileNodeView> childrenFileNodeViews
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

}
