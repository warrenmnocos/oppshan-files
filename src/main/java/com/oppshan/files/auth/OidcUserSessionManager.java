package com.oppshan.files.auth;

import com.oppshan.files.user.UserAccountService;
import com.oppshan.files.user.UserAccountView;
import io.quarkus.oidc.IdToken;
import io.quarkus.oidc.OidcSession;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.inject.Inject;
import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.lang.annotation.Annotation;

@ApplicationScoped
public class OidcUserSessionManager implements UserSessionManager {

    private final OidcSession oidcSession;

    private final SecurityIdentity securityIdentity;

    private final UserAccountService userAccountService;

    @Inject
    public OidcUserSessionManager(OidcSession oidcSession,
                                  SecurityIdentity securityIdentity,
                                  UserAccountService userAccountService) {
        this.oidcSession = oidcSession;
        this.securityIdentity = securityIdentity;
        this.userAccountService = userAccountService;
    }

    @NotNull
    @Override
    public UserAccountView getSessionUserAccount() {
        if (isSignedOut()) {
            return UserAccountView.anonymous();
        }

        return CDI.current()
                .select(
                        JsonWebToken.class,
                        new IdToken() {

                            @Override
                            public Class<? extends Annotation> annotationType() {
                                return IdToken.class;
                            }
                        }
                )
                .stream()
                .findFirst()
                .map(userAccountService::createOrGetUserAccount)
                .orElse(UserAccountView.anonymous());
    }

    @Override
    public boolean isSignedOut() {
        return securityIdentity.isAnonymous();
    }

    @Override
    public void signOut() {
        oidcSession.logout().await().indefinitely();
    }
}
