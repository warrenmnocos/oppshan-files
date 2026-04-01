package com.oppshan.files.config;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;

@ConfigMapping(prefix = "app.storage")
public interface ApplicationStorage {

    @WithDefault("1000000")
    int maxBytes();
}
