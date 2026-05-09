package com.oppshan.files.user;

import com.oppshan.files.config.ApplicationStorage;
import com.oppshan.files.exception.BusinessException;
import com.oppshan.files.file.FileNode;
import com.oppshan.files.file.FileNodeRepository;
import com.oppshan.files.file.UserStorage;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Transactional
@ApplicationScoped
public class UserAccountService {

    private final UserAccountRepository userAccountRepository;

    private final IdpAccountRepository idpAccountRepository;

    private final FileNodeRepository fileNodeRepository;

    private final ApplicationStorage applicationStorage;

    private final SecurityIdentity securityIdentity;

    @Inject
    public UserAccountService(UserAccountRepository userAccountRepository,
                              IdpAccountRepository idpAccountRepository,
                              FileNodeRepository fileNodeRepository,
                              ApplicationStorage applicationStorage,
                              SecurityIdentity securityIdentity) {
        this.userAccountRepository = userAccountRepository;
        this.idpAccountRepository = idpAccountRepository;
        this.fileNodeRepository = fileNodeRepository;
        this.applicationStorage = applicationStorage;
        this.securityIdentity = securityIdentity;
    }

    @NotNull
    public UserAccountView createOrGetUserAccount(@NotNull JsonWebToken idToken) {
        return getOrCreateFromGoogle(idToken)
                .orElseThrow(BusinessException::authenticationRequired);
    }

    @NotNull
    public UserAccountView getUserAccount(@NotNull JsonWebToken idToken) {
        return idpAccountRepository.findByProviderNameAndProviderId(getProviderName(), idToken.getSubject())
                .map(this::toUserAccountView)
                .orElseThrow(BusinessException::userNotFound);
    }

    @NotNull
    public UserAccountView getUserAccount(@NotNull UUID uuid) {
        return userAccountRepository.findById(uuid)
                .map(this::toUserAccountView)
                .orElseThrow(BusinessException::userNotFound);
    }

    private Optional<UserAccountView> getOrCreateFromGoogle(JsonWebToken idToken) {
        final var providerName = getProviderName();
        if (!"google".equals(providerName)) {
            return Optional.empty();
        }

        final var providerId = idToken.getSubject();
        final var nullableGoogleIdpAccount = idpAccountRepository.findByProviderNameAndProviderId(providerName, providerId)
                .flatMap(IdpAccount::asGoogleAccount);
        if (nullableGoogleIdpAccount.isPresent()) {
            final var googleAccount = nullableGoogleIdpAccount.get();
            final var userAccount = googleAccount.getUserAccount();
            var changed = false;
            final String givenName = idToken.getClaim("given_name");
            if (givenName != null && !givenName.equals(userAccount.getFirstName())) {
                userAccount.setFirstName(givenName);
                changed = true;
            }

            final String familyName = idToken.getClaim("family_name");
            if (familyName != null && !familyName.equals(userAccount.getLastName())) {
                userAccount.setLastName(familyName);
                changed = true;
            }

            final String name = idToken.getClaim("name");
            if (name != null && !name.equals(googleAccount.getName())) {
                googleAccount.setName(name);
                changed = true;
            }

            if (changed) {
                userAccountRepository.save(userAccount);
                idpAccountRepository.save(googleAccount);
            }

            return Optional.of(toUserAccountView(userAccount, googleAccount));
        }

        ensureStorageCapacity();

        final var newUser = new UserAccount()
                .setFirstName(idToken.getClaim("given_name"))
                .setLastName(idToken.getClaim("family_name"));
        final var googleAccount = new GoogleAccount()
                .setUserAccount(newUser)
                .setProviderName(providerName)
                .setProviderId(providerId)
                .setEmail(idToken.getClaim("email"))
                .setName(idToken.getClaim("name"))
                .setPhotoUrl(idToken.getClaim("picture"));
        newUser.setUserStorage(
                        new UserStorage()
                                .setUserAccount(newUser)
                                .setMaxStorageBytes(applicationStorage.userMaxBytes())
                                .setMaxFileUploadBytes(applicationStorage.fileUploadMaxBytes())
                                .setRootFileNode(FileNode.createRoot(newUser))
                )
                .getIdpAccounts().add(googleAccount);
        userAccountRepository.insertWithSession(newUser);
        return Optional.of(toUserAccountView(newUser, googleAccount));
    }

    private UserAccountView toUserAccountView(UserAccount userAccount) {
        try (final var idpAccounts = idpAccountRepository.stream(userAccount.getUuid())) {
            return toUserAccountView(
                    userAccount,
                    idpAccounts.findFirst()
                            .orElseThrow(BusinessException::userNotFound)
            );
        }
    }

    private UserAccountView toUserAccountView(IdpAccount idpAccount) {
        return toUserAccountView(idpAccount.getUserAccount(), idpAccount);
    }

    private UserAccountView toUserAccountView(UserAccount user,
                                              IdpAccount idpAccount) {
        String email = null;
        String photoUrl = null;
        String googleName = null;
        final var nullableGoogleAccount = idpAccount.asGoogleAccount();
        if (nullableGoogleAccount.isPresent()) {
            final var googleAccount = nullableGoogleAccount.get();
            email = googleAccount.getEmail();
            photoUrl = googleAccount.getPhotoUrl();
            googleName = googleAccount.getName();
        }

        final var firstName = Objects.requireNonNullElse(user.getFirstName(), "");
        final var lastName = Objects.requireNonNullElse(user.getLastName(), "");
        final var trimmedFullName = (firstName + " " + lastName).trim();
        final String displayName;
        if (!trimmedFullName.isEmpty()) {
            displayName = trimmedFullName;
        } else if (googleName != null && !googleName.isBlank()) {
            displayName = googleName;
        } else {
            displayName = email;
        }

        final var usedBytes = fileNodeRepository.getTotalSizeBytes(user.getUuid());
        return user.toUserAccountView(email, photoUrl, displayName, usedBytes);
    }

    private String getProviderName() {
        final String providerName = securityIdentity.getAttribute("tenant-uuid");
        if (providerName == null || "default".equals(providerName)) {
            return "google";
        }

        return providerName;
    }

    private void ensureStorageCapacity() {
        final var userMaxBytes = applicationStorage.userMaxBytes();
        final var totalMaxBytes = applicationStorage.totalMaxBytes();
        final var totalUsed = fileNodeRepository.getTotalSizeBytes();
        if (totalUsed + userMaxBytes <= totalMaxBytes) {
            return;
        }

        throw BusinessException.storageCapacityExceeded();
    }
}
