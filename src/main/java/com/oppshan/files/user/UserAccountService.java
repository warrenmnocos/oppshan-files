package com.oppshan.files.user;

import com.oppshan.files.config.ApplicationStorage;
import com.oppshan.files.exception.BusinessException;
import com.oppshan.files.exception.ResourceNotFoundException;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.time.Instant;
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
    ApplicationStorage applicationStorage;

    public Optional<UserAccountView> findByIdp(@NotBlank String providerName,
                                               @NotBlank String providerId) {
        return idpAccountRepository.findByProviderNameAndProviderId(providerName, providerId)
                .map(IdpAccount::getUserAccount)
                .map(UserAccount::toUserAccountView);
    }

    @NotNull
    public UserAccountView processLogin(@NotNull JsonWebToken idToken) {
        return getOrCreateFromGoogle(idToken).orElseThrow(() -> new BusinessException("Google authentication required"));
    }

    @NotNull
    public UserAccountView getAuthenticatedUser(@NotNull JsonWebToken idToken) {
        return findByIdp(getProviderName(), idToken.getSubject())
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
            if (idToken.getClaim("name") != null && !idToken.getClaim("name").equals(user.getName())) {
                user.setName(idToken.getClaim("name"));
                userRepository.save(user);
            }
            return Optional.of(user.toUserAccountView());
        }

        final var now = Instant.now();
        final var newUser = new UserAccount();
        newUser.setName(idToken.getClaim("name"));
        newUser.setMaxStorageBytes(applicationStorage.maxBytes());
        newUser.setCreatedAt(now);
        userRepository.save(newUser);

        final var idpAccount = new GoogleAccount();
        idpAccount.setProviderName(providerName);
        idpAccount.setProviderId(providerId);
        idpAccount.setUserAccount(newUser);
        idpAccount.setEmail(idToken.getClaim("email"));
        idpAccount.setName(idToken.getClaim("name"));
        idpAccount.setPhotoUrl(idToken.getClaim("picture"));
        idpAccount.setCreatedAt(now);
        idpAccountRepository.save(idpAccount);
        return Optional.of(newUser.toUserAccountView());
    }

    private String getProviderName() {
        final String providerName = identity.getAttribute("tenant-id");
        if (providerName == null || "default".equals(providerName)) {
            return "google";
        }

        return providerName;
    }
}
