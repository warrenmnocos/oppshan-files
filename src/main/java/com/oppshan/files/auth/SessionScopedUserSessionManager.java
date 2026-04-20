package com.oppshan.files.auth;

import com.oppshan.files.user.UserAccountView;
import io.quarkus.arc.Lock;
import io.quarkus.arc.Lock.Type;
import io.smallrye.common.annotation.Identifier;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.SessionScoped;
import jakarta.enterprise.inject.Alternative;
import jakarta.inject.Inject;

import static jakarta.interceptor.Interceptor.Priority.APPLICATION;

@Alternative
@SessionScoped
@Priority(APPLICATION)
public class SessionScopedUserSessionManager implements UserSessionManager {

    private final UserSessionManager delegate;

    private UserAccountView sessionUserAccountView;

    @Inject
    public SessionScopedUserSessionManager(@Identifier("oidcUserSessionManager")
                                           UserSessionManager delegate) {
        this.delegate = delegate;
        sessionUserAccountView = UserAccountView.anonymous();
    }

    @Override
    @Lock(Type.WRITE)
    public UserAccountView getSessionUserAccount() {
        if (sessionUserAccountView.isAnonymous()) {
            sessionUserAccountView = delegate.getSessionUserAccount();
        }

        return sessionUserAccountView;
    }

    @Override
    @Lock(Type.READ)
    public boolean isSignedOut() {
        return sessionUserAccountView.isAnonymous() || delegate.isSignedOut();
    }

    @Override
    @Lock(Type.WRITE)
    public void signOut() {
        if (sessionUserAccountView.isAnonymous()) {
            return;
        }

        delegate.signOut();
    }
}
