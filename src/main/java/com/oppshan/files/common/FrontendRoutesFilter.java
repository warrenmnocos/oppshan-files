package com.oppshan.files.common;

import io.quarkus.vertx.web.RouteFilter;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class FrontendRoutesFilter {

    @RouteFilter(100)
    public void filter(RoutingContext rc) {
        String path = rc.normalizedPath();

        if (path.startsWith("/api") || path.startsWith("/q") || path.contains(".")) {
            rc.next();
            return;
        }

        rc.reroute("/index.html");
    }
}
