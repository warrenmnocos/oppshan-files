package com.oppshan.files.auth;

import com.oppshan.files.user.UserAccountView;
import io.quarkus.arc.Lock;
import io.quarkus.arc.Lock.Type;
import io.smallrye.common.annotation.Identifier;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.SessionScoped;
import jakarta.enterprise.inject.Alternative;
import jakarta.inject.Inject;
import jakarta.servlet.http.HttpSession;

import static jakarta.interceptor.Interceptor.Priority.APPLICATION;

@Alternative
@SessionScoped
@Priority(APPLICATION)
public class SessionScopedUserSessionManager implements UserSessionManager {

    private final UserSessionManager delegate;

    private final HttpSession httpSession;

    private UserAccountView sessionUserAccountView;

    @Inject
    public SessionScopedUserSessionManager(@Identifier("oidcUserSessionManager")
                                               UserSessionManager delegate,

                                           HttpSession httpSession) {
        this.delegate = delegate;
        this.httpSession = httpSession;
        sessionUserAccountView = UserAccountView.anonymous();
    }

    @Override
    @Lock(Type.WRITE)
    public UserAccountView getSessionUserAccount() {
        if (delegate.isSignedOut()) {
            sessionUserAccountView = UserAccountView.anonymous();
        } else if (sessionUserAccountView.isAnonymous()) {
            sessionUserAccountView = delegate.getSessionUserAccount();
        }

        return sessionUserAccountView;
    }

    @Override
    @Lock(Type.READ)
    public boolean isSignedOut() {
        return delegate.isSignedOut();
    }

    @Override
    @Lock(Type.WRITE)
    public void signOut() {
        delegate.signOut();
        sessionUserAccountView = UserAccountView.anonymous();

        try {
            if (httpSession != null) {
                httpSession.invalidate();
            }
        } catch (IllegalStateException ex) {
            // Ignored
        }
    }

    @Override
    @Lock(Type.WRITE)
    public void refreshSessionUserAccount() {
        sessionUserAccountView = delegate.getSessionUserAccount();
    }
}
