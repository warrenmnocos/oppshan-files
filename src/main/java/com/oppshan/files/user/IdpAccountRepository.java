package com.oppshan.files.user;

import com.oppshan.files.common.StatefulWriteRepository;
import jakarta.data.repository.CrudRepository;
import jakarta.data.repository.Find;
import jakarta.data.repository.Query;
import jakarta.data.repository.Repository;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

@Repository
public interface IdpAccountRepository
        extends CrudRepository<IdpAccount, UUID>, StatefulWriteRepository<IdpAccount> {

    @Find
    Optional<IdpAccount> findByProviderNameAndProviderId(@NotEmpty
                                                         String providerName,

                                                         @NotEmpty
                                                         String providerId);

    @Query("""
            SELECT ia
            FROM IdpAccount ia
            WHERE ia.userAccount.uuid = :userAccountUuid""")
    Stream<IdpAccount> stream(@NotNull
                              UUID userAccountUuid);
}
