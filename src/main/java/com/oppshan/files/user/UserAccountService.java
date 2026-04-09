package com.oppshan.files.user;

import com.oppshan.files.config.ApplicationStorage;
import com.oppshan.files.exception.BusinessException;
import com.oppshan.files.exception.MessageCode;
import com.oppshan.files.exception.ResourceNotFoundException;
import com.oppshan.files.file.FileNode;
import com.oppshan.files.file.FileNodeRepository;
import com.oppshan.files.file.UserStorage;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.Optional;

@Transactional
@ApplicationScoped
public class UserAccountService {

    @Inject
    UserAccountRepository userRepository;

    @Inject
    IdpAccountRepository idpAccountRepository;

    @Inject
    FileNodeRepository fileNodeRepository;

    @Inject
    ApplicationStorage applicationStorage;

    @Inject
    SecurityIdentity securityIdentity;

    @NotNull
    public UserAccountView processLogin(@NotNull JsonWebToken idToken) {
        return getOrCreateFromGoogle(idToken)
                .orElseThrow(() -> new BusinessException(MessageCode.AUTHENTICATION_REQUIRED));
    }

    @NotNull
    public UserAccountView getAuthenticatedUser(@NotNull JsonWebToken idToken) {
        return idpAccountRepository.findByProviderNameAndProviderId(getProviderName(), idToken.getSubject())
                .map(idp -> buildView(idp.getUserAccount(), idp))
                .orElseThrow(() -> new ResourceNotFoundException(MessageCode.USER_NOT_FOUND));
    }

    private Optional<UserAccountView> getOrCreateFromGoogle(JsonWebToken idToken) {
        final String providerName = getProviderName();
        if (!"google".equals(providerName)) {
            return Optional.empty();
        }

        final var providerId = idToken.getSubject();
        final var nullableIdpAccount = idpAccountRepository.findByProviderNameAndProviderId(providerName, providerId);
        if (nullableIdpAccount.isPresent()) {
            final var idpAccount = nullableIdpAccount.get();
            final var userAccount = idpAccount.getUserAccount();
            var changed = false;
            if (idToken.getClaim("given_name") != null && !idToken.getClaim("given_name").equals(userAccount.getFirstName())) {
                userAccount.setFirstName(idToken.getClaim("given_name"));
                changed = true;
            }

            if (idToken.getClaim("family_name") != null && !idToken.getClaim("family_name").equals(userAccount.getLastName())) {
                userAccount.setLastName(idToken.getClaim("family_name"));
                changed = true;
            }

            if (changed) {
                userRepository.save(userAccount);
            }

            return Optional.of(buildView(userAccount, idpAccount));
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
                                .setRootFileNode(FileNode.createRoot(newUser))
                )
                .getIdpAccounts().add(googleAccount);
        userRepository.insertWithSession(newUser);
        return Optional.of(buildView(newUser, googleAccount));
    }

    private UserAccountView buildView(UserAccount user,
                                      IdpAccount idpAccount) {
        String email = null;
        String photoUrl = null;
        final var google = idpAccount.asGoogleAccount();
        if (google.isPresent()) {
            email = google.get().getEmail();
            photoUrl = google.get().getPhotoUrl();
        }

        final long usedBytes = fileNodeRepository.sumSizeBytesByUserAccountUuid(user.getUuid());
        return user.toUserAccountView(email, photoUrl, usedBytes);
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
        final var totalUsed = fileNodeRepository.sumAllSizeBytes();
        if (totalUsed + userMaxBytes <= totalMaxBytes) {
            return;
        }

        throw BusinessException.storageCapacityExceeded();
    }
}
