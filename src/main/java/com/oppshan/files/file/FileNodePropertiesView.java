package com.oppshan.files.file;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public sealed interface FileNodePropertiesView extends Serializable
        permits DirectoryPropertiesView, RegularFilePropertiesView {

    UUID uuid();

    String name();

    Instant createdAt();

    Instant lastModifiedAt();
}
