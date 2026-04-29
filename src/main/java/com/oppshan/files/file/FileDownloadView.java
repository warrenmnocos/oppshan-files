package com.oppshan.files.file;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;

import java.io.InputStream;
import java.util.UUID;

@Valid
@RegisterForReflection
public record FileDownloadView(UUID userAccountUuid,
                               UUID fileNodeUuid,
                               String filename,
                               String mimeType,
                               long sizeBytes,
                               InputStream contentInputStream) {
}