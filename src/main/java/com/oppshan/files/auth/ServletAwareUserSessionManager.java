package com.oppshan.files.auth;

import com.oppshan.files.user.UserAccountView;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Priority;
import jakarta.decorator.Decorator;
import jakarta.decorator.Delegate;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import static jakarta.interceptor.Interceptor.Priority.APPLICATION;

/**
 * The decorator ServletAwareUserSessionManager exists purely to keep HttpServletRequest's @Produces bean alive in the
 * ARC graph (via the constructor @Inject HttpServletRequest parameter). That contract is implicit — anyone deleting the
 * decorator without thinking would silently break the CDI.current().select(HttpServletRequest.class).get() lookup
 * here.
 */
@Decorator
@Priority(APPLICATION)
public class ServletAwareUserSessionManager implements UserSessionManager {

    private final Logger logger = LoggerFactory.getLogger(ServletAwareUserSessionManager.class);

    private final UserSessionManager delegate;

    private final HttpServletRequest httpServletRequest;

    @Inject
    public ServletAwareUserSessionManager(@Delegate
                                          UserSessionManager delegate,

                                          HttpServletRequest httpServletRequest) {
        this.delegate = delegate;
        this.httpServletRequest = httpServletRequest;
    }

    @PostConstruct
    protected void initialize() {
        logger.trace("ServletAwareUserSessionManager created: {}", httpServletRequest.getServletContext().getContextPath());
    }

    @Override
    public UserAccountView getSessionUserAccount() {
        return delegate.getSessionUserAccount();
    }

    @Override
    public boolean isSignedOut() {
        return delegate.isSignedOut();
    }

    @Override
    public void signOut() {
        delegate.signOut();
    }

    @Override
    public void refreshSessionUserAccount() {
        delegate.refreshSessionUserAccount();
    }
}
