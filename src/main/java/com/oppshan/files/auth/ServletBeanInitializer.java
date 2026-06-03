package com.oppshan.files.auth;

import io.quarkus.runtime.Startup;
import jakarta.annotation.PostConstruct;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The decorator ServletBeanInitializer exists purely to keep HttpServletRequest's @Produces bean alive in the ARC graph
 * (via the constructor @Inject HttpServletRequest parameter). That contract is implicit — anyone deleting the decorator
 * without thinking would silently break the CDI.current().select(HttpServletRequest.class).get() lookup here.
 */
@Startup
@Singleton
public class ServletBeanInitializer {

    private final Logger logger = LoggerFactory.getLogger(ServletBeanInitializer.class);

    private final HttpServletRequest httpServletRequest;

    private final HttpServletResponse httpServletResponse;

    private final HttpSession httpServletSession;

    @Inject
    public ServletBeanInitializer(HttpServletRequest httpServletRequest,
                                  HttpServletResponse httpServletResponse,
                                  HttpSession httpServletSession) {
        this.httpServletRequest = httpServletRequest;
        this.httpServletResponse = httpServletResponse;
        this.httpServletSession = httpServletSession;
    }

    @PostConstruct
    protected void initialize() {
        logger.trace("ServletBeanInitializer initialized");
    }
}
