package com.oppshan.files.user;

import jakarta.data.repository.CrudRepository;
import jakarta.data.repository.Find;
import jakarta.data.repository.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdpAccountRepository extends CrudRepository<IdpAccount, UUID> {

    @Find
    Optional<IdpAccount> findByProviderNameAndProviderId(String providerName, String providerId);
}
