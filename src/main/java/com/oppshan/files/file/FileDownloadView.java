package com.oppshan.files.file;

import java.io.InputStream;
import java.util.UUID;

public record FileDownloadView(UUID userAccountUuid,
                               UUID fileNodeUuid,
                               String filename,
                               String mimeType,
                               long sizeBytes,
                               InputStream contentInputStream) {
}