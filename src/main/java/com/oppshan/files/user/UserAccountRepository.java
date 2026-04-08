package com.oppshan.files.user;

import com.oppshan.files.common.StatefulWriteRepository;
import jakarta.data.repository.CrudRepository;
import jakarta.data.repository.Repository;

@Repository
public interface UserAccountRepository
        extends CrudRepository<UserAccount, Long>, StatefulWriteRepository<UserAccount> {
}
