package com.oppshan.files.file;

import io.quarkus.runtime.annotations.RegisterForReflection;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@RegisterForReflection
public sealed interface FileNodePropertiesView extends Serializable
        permits DirectoryPropertiesView, RegularFilePropertiesView {

    UUID uuid();

    String name();

    Instant createdAt();

    Instant lastModifiedAt();
}
