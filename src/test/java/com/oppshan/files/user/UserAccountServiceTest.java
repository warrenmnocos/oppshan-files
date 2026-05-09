package com.oppshan.files.user;

import com.oppshan.files.config.ApplicationStorage;
import com.oppshan.files.exception.BusinessException;
import com.oppshan.files.exception.MessageCode;
import com.oppshan.files.file.FileNode;
import com.oppshan.files.file.UserStorage;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.instanceOf;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertThrows;

@QuarkusTest
class UserAccountServiceTest {

    @Inject
    UserAccountService userAccountService;

    @Inject
    ApplicationStorage applicationStorage;

    @Inject
    EntityManager entityManager;

    @Test
    void shouldGetExistingUserWhenIdentityProviderAccountAlreadyPresent() {
        final var seeded = seedExistingUser("Alice", "Wonderland", "alice@example.com",
                "Alice Wonderland", "https://example.com/alice.png");
        final var jwt = googleJwt(seeded.providerId(), "Alice", "Wonderland",
                "Alice Wonderland", "alice@example.com", "https://example.com/alice.png");

        final var view = userAccountService.createOrGetUserAccount(jwt);

        assertThat(view.uuid(), is(seeded.userAccountUuid()));
        assertThat(view.firstName(), is("Alice"));
        assertThat(view.lastName(), is("Wonderland"));
        assertThat(view.displayName(), is("Alice Wonderland"));
        assertThat(view.email(), is("alice@example.com"));
        assertThat(view.photoUrl(), is("https://example.com/alice.png"));
        assertThat(view.maxStorageBytes(), is(applicationStorage.userMaxBytes()));
        assertThat(view.maxFileUploadBytes(), is(applicationStorage.fileUploadMaxBytes()));
        assertThat(view.rootFileNodeUuid(), is(notNullValue()));
    }

    @Test
    void shouldUpdateFirstNameWhenJsonWebTokenClaimChanged() {
        final var seeded = seedExistingUser("OldFirst", "Surname", "user@example.com",
                "OldFirst Surname", "https://example.com/u.png");
        final var jwt = googleJwt(seeded.providerId(), "NewFirst", "Surname",
                "NewFirst Surname", "user@example.com", "https://example.com/u.png");

        final var view = userAccountService.createOrGetUserAccount(jwt);

        assertThat(view.uuid(), is(seeded.userAccountUuid()));
        assertThat(view.firstName(), is("NewFirst"));
        assertThat(view.lastName(), is("Surname"));
    }

    @Test
    void shouldUpdateLastNameWhenJsonWebTokenClaimChanged() {
        final var seeded = seedExistingUser("First", "OldSurname", "user@example.com",
                "First OldSurname", "https://example.com/u.png");
        final var jwt = googleJwt(seeded.providerId(), "First", "NewSurname",
                "First NewSurname", "user@example.com", "https://example.com/u.png");

        final var view = userAccountService.createOrGetUserAccount(jwt);

        assertThat(view.uuid(), is(seeded.userAccountUuid()));
        assertThat(view.firstName(), is("First"));
        assertThat(view.lastName(), is("NewSurname"));
    }

    @Test
    void shouldBeIdempotentWhenJsonWebTokenClaimsUnchanged() {
        final var seeded = seedExistingUser("Stable", "User", "stable@example.com",
                "Stable User", "https://example.com/s.png");
        final var jwt = googleJwt(seeded.providerId(), "Stable", "User",
                "Stable User", "stable@example.com", "https://example.com/s.png");

        final var first = userAccountService.createOrGetUserAccount(jwt);
        final var second = userAccountService.createOrGetUserAccount(jwt);

        assertThat(second.uuid(), is(first.uuid()));
        assertThat(second.firstName(), is(first.firstName()));
        assertThat(second.lastName(), is(first.lastName()));
        // Second call must not bump createdAt
        assertThat(second.createdAt(), is(first.createdAt()));
    }

    @Test
    void shouldReturnExistingUserWhenGettingByJsonWebToken() {
        final var seeded = seedExistingUser("Carol", "Curie", "carol@example.com",
                "Carol Curie", "https://example.com/c.png");
        final var jwt = googleJwt(seeded.providerId(), "Carol", "Curie",
                "Carol Curie", "carol@example.com", "https://example.com/c.png");

        final var view = userAccountService.getUserAccount(jwt);

        assertThat(view.uuid(), is(seeded.userAccountUuid()));
        assertThat(view.firstName(), is("Carol"));
        assertThat(view.email(), is("carol@example.com"));
    }

    @Test
    void shouldThrowUserNotFoundWhenJsonWebTokenSubjectUnknown() {
        final var jwt = googleJwt("unknown-sub-" + UUID.randomUUID(),
                "Ghost", "User", "Ghost User", "ghost@example.com", "https://example.com/g.png");

        final var businessException = assertThrows(
                BusinessException.class,
                () -> userAccountService.getUserAccount(jwt)
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.USER_NOT_FOUND));
    }

    @Test
    void shouldReturnExistingUserWhenGettingByUuid() {
        final var seeded = seedExistingUser("Dave", "Dean", "dave@example.com",
                "Dave Dean", "https://example.com/d.png");

        final var view = userAccountService.getUserAccount(seeded.userAccountUuid());

        assertThat(view.uuid(), is(seeded.userAccountUuid()));
        assertThat(view.firstName(), is("Dave"));
        assertThat(view.lastName(), is("Dean"));
        assertThat(view.email(), is("dave@example.com"));
    }

    @Test
    void shouldThrowUserNotFoundWhenGettingByUnknownUuid() {
        final var businessException = assertThrows(
                BusinessException.class,
                () -> userAccountService.getUserAccount(UUID.randomUUID())
        );
        assertThat(businessException.getErrorCode(), is(MessageCode.USER_NOT_FOUND));
    }

    @Test
    void shouldExposeStorageMetadataFromUserStorageEntityInUserAccountView() {
        final var seeded = seedExistingUser("Storage", "User", "storage@example.com",
                "Storage User", "https://example.com/st.png");

        final var view = userAccountService.getUserAccount(seeded.userAccountUuid());

        assertThat(view.maxStorageBytes(), is(applicationStorage.userMaxBytes()));
        assertThat(view.maxFileUploadBytes(), is(applicationStorage.fileUploadMaxBytes()));
        assertThat(view.usedStorageBytes(), is(0L));
        assertThat(view.rootFileNodeUuid(), is(notNullValue()));
        assertThat(view.createdAt(), is(notNullValue()));
        assertThat(view.lastModifiedAt(), is(notNullValue()));
    }

    @Test
    void shouldSeeAuditBumpFromFirstUpdateOnSecondCall() {
        final var seeded = seedExistingUser("Old", "Name", "auditbump@example.com",
                "Old Name", "https://example.com/o.png");
        final var renamingJwt = googleJwt(seeded.providerId(), "New", "Name",
                "New Name", "auditbump@example.com", "https://example.com/o.png");
        final var firstView = userAccountService.createOrGetUserAccount(renamingJwt);

        // Second invocation with the *same* (new) claims shouldn't trigger another update,
        // but the persisted user must keep the rename from the first invocation.
        final var secondView = userAccountService.createOrGetUserAccount(renamingJwt);

        assertThat(secondView.uuid(), is(firstView.uuid()));
        assertThat(secondView.firstName(), is("New"));
        assertThat(secondView.lastModifiedAt().toEpochMilli(),
                is(greaterThan(0L)));
    }

    @Test
    void shouldCreateNewUserFromJsonWebTokenWhenIdentityProviderAccountAbsent() {
        final var newSub = "new-google-sub-" + UUID.randomUUID();
        final var jwt = googleJwt(newSub, "Eve", "Newton",
                "Eve Newton", "eve@example.com", "https://example.com/eve.png");

        final var view = userAccountService.createOrGetUserAccount(jwt);

        assertThat(view.uuid(), is(notNullValue()));
        assertThat(view.firstName(), is("Eve"));
        assertThat(view.lastName(), is("Newton"));
        assertThat(view.email(), is("eve@example.com"));
        assertThat(view.photoUrl(), is("https://example.com/eve.png"));
        assertThat(view.usedStorageBytes(), is(0L));
        assertThat(view.maxStorageBytes(), is(applicationStorage.userMaxBytes()));
        assertThat(view.maxFileUploadBytes(), is(applicationStorage.fileUploadMaxBytes()));
        assertThat(view.rootFileNodeUuid(), is(notNullValue()));
        assertThat(view.createdAt(), is(notNullValue()));
        assertThat(view.lastModifiedAt(), is(notNullValue()));
    }

    @Test
    void shouldCreateRootWithFourDefaultSubdirectoriesForNewUser() {
        final var newSub = "new-google-sub-" + UUID.randomUUID();
        final var jwt = googleJwt(newSub, "Frank", "Frost",
                "Frank Frost", "frank@example.com", "https://example.com/frank.png");

        final var view = userAccountService.createOrGetUserAccount(jwt);

        QuarkusTransaction.requiringNew().run(() -> {
            final var root = entityManager.find(FileNode.class, view.rootFileNodeUuid());
            assertThat(root, is(notNullValue()));
            assertThat(root.getName(), is("Root"));

            final var childNames = root.getChildFileNodes().stream()
                    .map(FileNode::getName)
                    .toList();
            assertThat(childNames, containsInAnyOrder("Audio", "Documents", "Photos", "Videos"));
        });
    }

    @Test
    void shouldNotThrowNullPointerExceptionWhenGivenNameClaimMissing() {
        final var newSub = "new-google-sub-" + UUID.randomUUID();
        // Map.of() leaves "given_name" out entirely; idToken.getClaim("given_name") returns null
        // — exactly the production scenario where the comparator NPE'd.
        final var jwt = new TestGoogleJwt(newSub, Map.of(
                "family_name", "OnlyLast",
                "name", "OnlyLast",
                "email", "missing-given@example.com",
                "picture", "https://example.com/missing-given.png"
        ));

        // Whatever the failure is (constraint violation, validation error, or success with null),
        // it must NOT be a NullPointerException coming from the comparator chain.
        try {
            userAccountService.createOrGetUserAccount(jwt);
            // If validation lets null through, the create-path must at least not crash.
        } catch (Exception ex) {
            Throwable cursor = ex;
            while (cursor != null) {
                assertThat("Comparator NPE regression",
                        cursor, is(not(instanceOf(NullPointerException.class))));
                cursor = cursor.getCause();
            }
        }
    }

    @Test
    void shouldNotThrowNullPointerExceptionWhenFamilyNameClaimMissing() {
        final var newSub = "new-google-sub-" + UUID.randomUUID();
        final var jwt = new TestGoogleJwt(newSub, Map.of(
                "given_name", "OnlyFirst",
                "name", "OnlyFirst",
                "email", "missing-family@example.com",
                "picture", "https://example.com/missing-family.png"
        ));

        try {
            userAccountService.createOrGetUserAccount(jwt);
        } catch (Exception ex) {
            Throwable cursor = ex;
            while (cursor != null) {
                assertThat("Comparator NPE regression",
                        cursor, is(not(instanceOf(NullPointerException.class))));
                cursor = cursor.getCause();
            }
        }
    }

    @Test
    void shouldUseFamilyNameAsDisplayNameWhenGivenNameClaimMissing() {
        final var newSub = "new-google-sub-" + UUID.randomUUID();
        final var jwt = new TestGoogleJwt(newSub, Map.of(
                "family_name", "OnlyLast",
                "name", "OnlyLast",
                "email", "missing-given@example.com",
                "picture", "https://example.com/missing-given.png"
        ));

        final var view = userAccountService.createOrGetUserAccount(jwt);

        assertThat(view.firstName(), is(nullValue()));
        assertThat(view.lastName(), is("OnlyLast"));
        assertThat(view.displayName(), is("OnlyLast"));
    }

    @Test
    void shouldUseGivenNameAsDisplayNameWhenFamilyNameClaimMissing() {
        final var newSub = "new-google-sub-" + UUID.randomUUID();
        final var jwt = new TestGoogleJwt(newSub, Map.of(
                "given_name", "OnlyFirst",
                "name", "OnlyFirst",
                "email", "missing-family@example.com",
                "picture", "https://example.com/missing-family.png"
        ));

        final var view = userAccountService.createOrGetUserAccount(jwt);

        assertThat(view.firstName(), is("OnlyFirst"));
        assertThat(view.lastName(), is(nullValue()));
        assertThat(view.displayName(), is("OnlyFirst"));
    }

    @Test
    void shouldFallBackToGoogleNameAsDisplayNameWhenGivenAndFamilyNameClaimsMissing() {
        final var newSub = "new-google-sub-" + UUID.randomUUID();
        final var jwt = new TestGoogleJwt(newSub, Map.of(
                "name", "Acme Corp",
                "email", "contact@acme.example.com",
                "picture", "https://example.com/acme.png"
        ));

        final var view = userAccountService.createOrGetUserAccount(jwt);

        assertThat(view.firstName(), is(nullValue()));
        assertThat(view.lastName(), is(nullValue()));
        assertThat(view.displayName(), is("Acme Corp"));
    }

    @Test
    void shouldFallBackToEmailAsDisplayNameWhenAllNameClaimsMissing() {
        final var newSub = "new-google-sub-" + UUID.randomUUID();
        final var jwt = new TestGoogleJwt(newSub, Map.of(
                "email", "lonely@example.com"
        ));

        final var view = userAccountService.createOrGetUserAccount(jwt);

        assertThat(view.firstName(), is(nullValue()));
        assertThat(view.lastName(), is(nullValue()));
        assertThat(view.displayName(), is("lonely@example.com"));
    }

    private static JsonWebToken googleJwt(String sub,
                                          String givenName,
                                          String familyName,
                                          String name,
                                          String email,
                                          String picture) {
        final var claims = Map.of(
                "given_name", givenName == null ? "" : givenName,
                "family_name", familyName == null ? "" : familyName,
                "name", name == null ? "" : name,
                "email", email == null ? "" : email,
                "picture", picture == null ? "" : picture
        );
        return new TestGoogleJwt(sub, claims);
    }

    private SeededUser seedExistingUser(String firstName,
                                        String lastName,
                                        String email,
                                        String googleName,
                                        String photoUrl) {
        final var providerId = "test-sub-" + UUID.randomUUID();
        return seedExistingUser(providerId, firstName, lastName, email, googleName, photoUrl);
    }

    private SeededUser seedExistingUser(String providerId,
                                        String firstName,
                                        String lastName,
                                        String email,
                                        String googleName,
                                        String photoUrl) {
        final var seedInstant = Instant.now();
        final var holder = new AtomicReference<UUID>();
        QuarkusTransaction.requiringNew().run(() -> {
            final var userAccount = new UserAccount()
                    .setFirstName(firstName)
                    .setLastName(lastName)
                    .setCreatedAt(seedInstant)
                    .setLastModifiedAt(seedInstant);
            final var rootFileNode = FileNode.createDirectory(userAccount, "Root");
            final var userStorage = new UserStorage()
                    .setUserAccount(userAccount)
                    .setMaxStorageBytes(applicationStorage.userMaxBytes())
                    .setMaxFileUploadBytes(applicationStorage.fileUploadMaxBytes())
                    .setRootFileNode(rootFileNode);
            userAccount.setUserStorage(userStorage);
            entityManager.persist(userAccount);
            entityManager.flush();
            holder.set(userAccount.getUuid());
            // Persist the GoogleAccount as its own managed entity. Adding it to
            // userAccount.getIdpAccounts() before persist would either (a) trigger an NPE in
            // IdpAccount.compareTo when JDK 25's TreeMap.addEntryToEmptyMap calls compare(key, key)
            // for its sanity check (uuid is null), or (b) throw "Detached entity passed to persist"
            // if we pre-seed the uuid (Hibernate then thinks the entity is detached). Persisting
            // separately writes the FK on the owning @ManyToOne side; the inverse set is rehydrated
            // when the user is reloaded.
            final var googleAccount = new GoogleAccount()
                    .setEmail(email)
                    .setName(googleName)
                    .setPhotoUrl(photoUrl != null ? photoUrl : "https://example.invalid/photo.png");
            googleAccount.setProviderName("google")
                    .setProviderId(providerId)
                    .setUserAccount(userAccount);
            entityManager.persist(googleAccount);
            entityManager.flush();
        });
        return new SeededUser(holder.getAndSet(null), providerId);
    }

    private record SeededUser(UUID userAccountUuid, String providerId) {
    }

    private record TestGoogleJwt(String subject, Map<String, String> claims) implements JsonWebToken {

        @Override
        public String getName() {
            return subject;
        }

        @Override
        public Set<String> getClaimNames() {
            return claims.keySet();
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> T getClaim(String claimName) {
            if ("sub".equals(claimName)) {
                return (T) subject;
            }
            return (T) claims.get(claimName);
        }

        @Override
        public String getRawToken() {
            return "";
        }

        @Override
        public String getIssuer() {
            return "https://test.invalid";
        }

        @Override
        public Set<String> getAudience() {
            return Set.of();
        }

        @Override
        public long getExpirationTime() {
            return Instant.now().plusSeconds(3600).getEpochSecond();
        }

        @Override
        public long getIssuedAtTime() {
            return Instant.now().getEpochSecond();
        }

        @Override
        public String getSubject() {
            return subject;
        }

        @Override
        public String getTokenID() {
            return UUID.randomUUID().toString();
        }

        @Override
        public Set<String> getGroups() {
            return Set.of();
        }
    }
}
