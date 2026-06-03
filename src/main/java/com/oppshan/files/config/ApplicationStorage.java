package com.oppshan.files.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

@ConfigMapping(prefix = "app.storage")
public interface ApplicationStorage {

    @Min(100000)
    @WithDefault("104857600")
    long userMaxBytes();

    @Min(100000)
    @WithDefault("21474836480")
    long totalMaxBytes();

    @Min(1048576)
    @WithDefault("104857600")
    long fileUploadMaxBytes();

    @NotEmpty
    @WithDefault("AES/CTR/NoPadding")
    String encryptionCipherAlgorithm();

    @NotEmpty
    @Size(min = 32)
    String encryptionPassphrase();

    @Min(1000000)
    @WithDefault("1000000")
    int encryptionKdfIterations();

    @Min(128)
    @WithDefault("256")
    int encryptionKdfKeyLength();

    @NotEmpty
    @Size(min = 8)
    String encryptionKdfSalt();

    @Min(16)
    int encryptionIvLength();
}
