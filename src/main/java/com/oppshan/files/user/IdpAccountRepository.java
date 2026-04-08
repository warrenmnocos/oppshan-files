package com.oppshan.files.user;

import com.oppshan.files.common.StatefulWriteRepository;
import jakarta.data.repository.CrudRepository;
import jakarta.data.repository.Find;
import jakarta.data.repository.Repository;

import java.util.Optional;

@Repository
public interface IdpAccountRepository
        extends CrudRepository<IdpAccount, Long>, StatefulWriteRepository<IdpAccount> {

    @Find
    Optional<IdpAccount> findByProviderNameAndProviderId(String providerName, String providerId);
}
