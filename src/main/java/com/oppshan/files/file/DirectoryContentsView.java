package com.oppshan.files.file;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;
import java.util.UUID;

public record DirectoryContentsView(
        UUID uuid,
        String name,
        UUID parentUuid,
        List<BreadcrumbView> breadcrumbViews,
        List<FileNodeView> childrenFileNodeViews
) implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

}
