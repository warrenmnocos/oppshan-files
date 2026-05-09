package com.oppshan.files.auth;

import com.oppshan.files.user.UserAccountView;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.sameInstance;

class SessionScopedUserSessionManagerTest {

    @Test
    void shouldReturnAnonymousUserAccountWhenNeverPopulated() {
        final var delegate = new RecordingUserSessionManager();
        final var manager = new SessionScopedUserSessionManager(delegate);

        assertThat(manager.getSessionUserAccount().isAnonymous(), is(true));
    }

    @Test
    void shouldPopulateCacheFromDelegateOnFirstSessionUserAccountLookup() {
        final var delegate = new RecordingUserSessionManager();
        delegate.setSessionUserAccount(signedInView("Alice"));
        final var manager = new SessionScopedUserSessionManager(delegate);

        final var view = manager.getSessionUserAccount();

        assertThat(view.firstName(), is("Alice"));
        assertThat(delegate.getSessionUserAccountInvocations(), is(1));
    }

    @Test
    void shouldServeCachedSessionUserAccountOnSubsequentLookups() {
        final var delegate = new RecordingUserSessionManager();
        delegate.setSessionUserAccount(signedInView("Bob"));
        final var manager = new SessionScopedUserSessionManager(delegate);

        final var first = manager.getSessionUserAccount();
        final var second = manager.getSessionUserAccount();

        assertThat(second, is(sameInstance(first)));
        assertThat(delegate.getSessionUserAccountInvocations(), is(1));
    }

    @Test
    void shouldEarlyReturnFromSignOutWhenCacheAnonymous() {
        final var delegate = new RecordingUserSessionManager();
        final var manager = new SessionScopedUserSessionManager(delegate);

        manager.signOut();

        assertThat(delegate.signOutInvocations(), is(0));
    }

    @Test
    void shouldReportSignedOutWhenCacheAnonymousEvenWhileDelegateSignedIn() {
        final var delegate = new RecordingUserSessionManager();
        delegate.setSignedOut(false);
        final var manager = new SessionScopedUserSessionManager(delegate);

        assertThat(manager.isSignedOut(), is(true));
    }

    @Test
    void shouldReportNotSignedOutWhenCachePopulatedAndDelegateSignedIn() {
        final var delegate = new RecordingUserSessionManager();
        delegate.setSessionUserAccount(signedInView("Carol"));
        delegate.setSignedOut(false);
        final var manager = new SessionScopedUserSessionManager(delegate);
        manager.getSessionUserAccount();

        assertThat(manager.isSignedOut(), is(false));
    }

    @Test
    void shouldReportSignedOutWhenDelegateLosesIdentityAfterCachePopulated() {
        final var delegate = new RecordingUserSessionManager();
        delegate.setSessionUserAccount(signedInView("Dave"));
        delegate.setSignedOut(false);
        final var manager = new SessionScopedUserSessionManager(delegate);
        manager.getSessionUserAccount();

        // OIDC tokens expire / are cleared by another path; cache is still populated.
        delegate.setSignedOut(true);

        assertThat(manager.isSignedOut(), is(true));
    }

    @Test
    void shouldRefreshCacheFromDelegateOnExplicitRefresh() {
        final var delegate = new RecordingUserSessionManager();
        delegate.setSessionUserAccount(signedInView("Initial"));
        final var manager = new SessionScopedUserSessionManager(delegate);
        manager.getSessionUserAccount();
        delegate.setSessionUserAccount(signedInView("Updated"));

        manager.refreshSessionUserAccount();

        assertThat(manager.getSessionUserAccount().firstName(), is("Updated"));
    }

    private static UserAccountView signedInView(String firstName) {
        return new UserAccountView(
                UUID.randomUUID(),
                firstName,
                firstName + "Last",
                firstName + " " + firstName + "Last",
                firstName.toLowerCase() + "@example.com",
                "https://example.com/" + firstName + ".png",
                0L,
                10_000_000L,
                1_000_000L,
                UUID.randomUUID(),
                Instant.now(),
                Instant.now()
        );
    }

    private static class RecordingUserSessionManager implements UserSessionManager {

        private final AtomicInteger getSessionUserAccountCount = new AtomicInteger();

        private final AtomicInteger signOutCount = new AtomicInteger();

        private UserAccountView sessionUserAccount = UserAccountView.anonymous();

        private boolean signedOut = true;

        @Override
        public UserAccountView getSessionUserAccount() {
            getSessionUserAccountCount.incrementAndGet();
            return sessionUserAccount;
        }

        @Override
        public boolean isSignedOut() {
            return signedOut;
        }

        @Override
        public void signOut() {
            signOutCount.incrementAndGet();
            sessionUserAccount = UserAccountView.anonymous();
            signedOut = true;
        }

        void setSessionUserAccount(UserAccountView view) {
            this.sessionUserAccount = view;
            this.signedOut = view.isAnonymous();
        }

        void setSignedOut(boolean signedOut) {
            this.signedOut = signedOut;
        }

        int getSessionUserAccountInvocations() {
            return getSessionUserAccountCount.get();
        }

        int signOutInvocations() {
            return signOutCount.get();
        }
    }
}
