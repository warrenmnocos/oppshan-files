package com.oppshan.files.user;

import com.oppshan.files.config.ApplicationStorage;
import com.oppshan.files.exception.BusinessException;
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
    SecurityIdentity identity;

    @Inject
    FileNodeRepository fileNodeRepository;

    @Inject
    ApplicationStorage applicationStorage;

    @NotNull
    public UserAccountView processLogin(@NotNull JsonWebToken idToken) {
        return getOrCreateFromGoogle(idToken).orElseThrow(() -> new BusinessException("Google authentication required"));
    }

    @NotNull
    public UserAccountView getAuthenticatedUser(@NotNull JsonWebToken idToken) {
        return idpAccountRepository.findByProviderNameAndProviderId(getProviderName(), idToken.getSubject())
                .map(idp -> buildView(idp.getUserAccount(), idp))
                .orElseThrow(() -> new ResourceNotFoundException("UserAccount not found"));
    }

    private Optional<UserAccountView> getOrCreateFromGoogle(JsonWebToken idToken) {
        final String providerName = getProviderName();
        if (!"google".equals(providerName)) {
            return Optional.empty();
        }

        final var providerId = idToken.getSubject();
        final var nullableIdp = idpAccountRepository.findByProviderNameAndProviderId(providerName, providerId);
        if (nullableIdp.isPresent()) {
            final var idp = nullableIdp.get();
            final var user = idp.getUserAccount();
            boolean changed = false;
            if (idToken.getClaim("given_name") != null && !idToken.getClaim("given_name").equals(user.getFirstName())) {
                user.setFirstName(idToken.getClaim("given_name"));
                changed = true;
            }
            if (idToken.getClaim("family_name") != null && !idToken.getClaim("family_name").equals(user.getLastName())) {
                user.setLastName(idToken.getClaim("family_name"));
                changed = true;
            }

            if (changed) {
                userRepository.save(user);
            }

            return Optional.of(buildView(user, idp));
        }

        final var googleAccount = new GoogleAccount()
                .setProviderName(providerName)
                .setProviderId(providerId)
                .setEmail(idToken.getClaim("email"))
                .setName(idToken.getClaim("name"))
                .setPhotoUrl(idToken.getClaim("picture"));

        final var newUser = new UserAccount();
        newUser.setFirstName(idToken.getClaim("given_name"))
                .setLastName(idToken.getClaim("family_name"))
                .setUserStorage(
                        new UserStorage()
                                .setUserAccount(newUser)
                                .setMaxStorageBytes(applicationStorage.maxBytes())
                                .setRootFileNode(FileNode.createRoot(newUser))
                )
                .getIdpAccounts().add(
                        googleAccount.setUserAccount(newUser)
                );
        userRepository.insertWithSession(newUser);
        return Optional.of(buildView(newUser, googleAccount));
    }

    private UserAccountView buildView(UserAccount user, IdpAccount idp) {
        String email = null;
        String photoUrl = null;
        final var google = idp.asGoogleAccount();
        if (google.isPresent()) {
            email = google.get().getEmail();
            photoUrl = google.get().getPhotoUrl();
        }
        final long usedBytes = fileNodeRepository.sumSizeBytesByUserAccountUuid(user.getUuid());
        return user.toUserAccountView(email, photoUrl, usedBytes);
    }

    private String getProviderName() {
        final String providerName = identity.getAttribute("tenant-uuid");
        if (providerName == null || "default".equals(providerName)) {
            return "google";
        }

        return providerName;
    }
}
