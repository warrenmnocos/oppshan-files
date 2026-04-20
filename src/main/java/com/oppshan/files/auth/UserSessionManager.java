package com.oppshan.files.auth;

import com.oppshan.files.user.UserAccountView;
import jakarta.validation.constraints.NotNull;

import java.io.Serializable;

public interface UserSessionManager extends Serializable {

    @NotNull
    UserAccountView getSessionUserAccount();

    boolean isSignedOut();

    void signOut();
}
