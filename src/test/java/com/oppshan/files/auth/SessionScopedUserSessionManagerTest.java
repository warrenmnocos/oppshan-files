package com.oppshan.files.auth;

import com.oppshan.files.user.UserAccountView;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.sameInstance;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.atMostOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SessionScopedUserSessionManagerTest {

    @Mock
    UserSessionManager delegate;

    @Mock
    HttpSession httpSession;

    @Test
    void shouldReturnAnonymousUserAccountWhenNeverPopulated() {
        given(delegate.isSignedOut()).willReturn(true);
        final var manager = new SessionScopedUserSessionManager(delegate, httpSession);

        assertThat(manager.getSessionUserAccount().isAnonymous(), is(true));
        verify(delegate, atMostOnce()).isSignedOut();
    }

    @Test
    void shouldPopulateCacheFromDelegateOnFirstSessionUserAccountLookup() {
        final var alice = signedInView("Alice");
        given(delegate.getSessionUserAccount()).willReturn(alice);
        final var manager = new SessionScopedUserSessionManager(delegate, httpSession);

        final var view = manager.getSessionUserAccount();

        assertThat(view.firstName(), is("Alice"));
        verify(delegate, atMostOnce()).getSessionUserAccount();
    }

    @Test
    void shouldServeCachedSessionUserAccountOnSubsequentLookups() {
        final var bob = signedInView("Bob");
        given(delegate.getSessionUserAccount()).willReturn(bob);
        final var manager = new SessionScopedUserSessionManager(delegate, httpSession);

        final var first = manager.getSessionUserAccount();
        final var second = manager.getSessionUserAccount();

        assertThat(second, is(sameInstance(first)));
        verify(delegate, atMostOnce()).getSessionUserAccount();
    }

    @Test
    void shouldDelegateSignOutEvenWhenCacheAnonymous() {
        final var manager = new SessionScopedUserSessionManager(delegate, httpSession);

        manager.signOut();

        verify(delegate, atMostOnce()).isSignedOut();
        verify(delegate, atMostOnce()).signOut();
    }

    @Test
    void shouldReportNotSignedOutWhenDelegateSignedInEvenWhileCacheAnonymous() {
        given(delegate.isSignedOut()).willReturn(false);
        final var manager = new SessionScopedUserSessionManager(delegate, httpSession);

        assertThat(manager.isSignedOut(), is(false));
        verify(delegate, atMostOnce()).isSignedOut();
    }

    @Test
    void shouldReportNotSignedOutWhenCachePopulatedAndDelegateSignedIn() {
        final var carol = signedInView("Carol");
        given(delegate.getSessionUserAccount()).willReturn(carol);
        given(delegate.isSignedOut()).willReturn(false);

        final var manager = new SessionScopedUserSessionManager(delegate, httpSession);
        assertThat(manager.getSessionUserAccount(), is(sameInstance(carol)));
        clearInvocations(delegate);

        assertThat(manager.isSignedOut(), is(false));
        verify(delegate, atMostOnce()).isSignedOut();
    }

    @Test
    void shouldReportSignedOutWhenDelegateLosesIdentityAfterCachePopulated() {
        final var dave = signedInView("Dave");
        given(delegate.getSessionUserAccount()).willReturn(dave);
        given(delegate.isSignedOut()).willReturn(false);

        final var manager = new SessionScopedUserSessionManager(delegate, httpSession);
        assertThat(manager.getSessionUserAccount(), is(sameInstance(dave)));

        given(delegate.isSignedOut()).willReturn(true);

        assertThat(manager.isSignedOut(), is(true));
    }

    @Test
    void shouldRefreshCacheFromDelegateOnExplicitRefresh() {
        final var eve = signedInView("Eve");
        given(delegate.getSessionUserAccount()).willReturn(eve);

        final var manager = new SessionScopedUserSessionManager(delegate, httpSession);
        assertThat(manager.getSessionUserAccount(), is(sameInstance(eve)));

        final var felix = signedInView("Felix");
        given(delegate.getSessionUserAccount()).willReturn(felix);

        assertThat(manager.getSessionUserAccount(), is(sameInstance(eve)));

        manager.refreshSessionUserAccount();

        assertThat(manager.getSessionUserAccount(), is(sameInstance(felix)));
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
}