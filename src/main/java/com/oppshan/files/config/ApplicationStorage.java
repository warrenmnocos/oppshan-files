package com.oppshan.files.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ConfigMapping(prefix = "app.storage")
public interface ApplicationStorage {

    @Min(100000)
    @WithDefault("1000000")
    int maxBytes();

    @NotEmpty
    @WithDefault("AES/CTR/NoPadding")
    String encryptionCipher();

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
