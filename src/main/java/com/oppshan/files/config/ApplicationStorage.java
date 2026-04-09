package com.oppshan.files.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;

@ConfigMapping(prefix = "app.storage")
public interface ApplicationStorage {

    @Min(100000)
    @WithDefault("104857600")
    long userMaxBytes();

    @Min(100000)
    @WithDefault("21474836480")
    long totalMaxBytes();

    @NotEmpty
    @WithDefault("AES/CTR/NoPadding")
    String encryptionCipherAlgorithm();

    @NotEmpty
    String encryptionPassphrase();

    @Min(600000)
    @WithDefault("600000")
    int encryptionKdfIterations();

    @Min(128)
    @WithDefault("256")
    int encryptionKdfKeyLength();

    @NotEmpty
    String encryptionKdfSalt();

    @Min(16)
    int encryptionIvLength();
}
