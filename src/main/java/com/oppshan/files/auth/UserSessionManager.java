package com.oppshan.files.auth;

import com.oppshan.files.user.UserAccountView;
import jakarta.validation.constraints.NotNull;

public interface UserSessionManager {

    @NotNull
    UserAccountView getSessionUserAccount();

    boolean isSignedOut();

    void signOut();
}
