package com.oppshan.files.file;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

public interface FileNodePropertiesView extends Serializable {

    UUID uuid();

    String name();

    Instant createdAt();

    Instant lastModifiedAt();
}
