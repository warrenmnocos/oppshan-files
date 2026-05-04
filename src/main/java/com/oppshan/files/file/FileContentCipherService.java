package com.oppshan.files.file;

import com.oppshan.files.config.ApplicationStorage;
import io.quarkus.runtime.Startup;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;

@Startup
@ApplicationScoped
public class FileContentCipherService {

    private final ApplicationStorage applicationStorage;

    private String cipherAlgorithm;

    private SecretKey derivedKey;

    private SecureRandom secureRandom;

    @Inject
    public FileContentCipherService(ApplicationStorage applicationStorage) {
        this.applicationStorage = applicationStorage;
    }

    @PostConstruct
    protected void initialize() throws GeneralSecurityException {
        this.cipherAlgorithm = applicationStorage.encryptionCipherAlgorithm();

        final var masterKey = applicationStorage.encryptionPassphrase().toCharArray();
        final var salt = applicationStorage.encryptionKdfSalt().getBytes(StandardCharsets.UTF_8);
        final var iterations = applicationStorage.encryptionKdfIterations();
        final var keyLength = applicationStorage.encryptionKdfKeyLength();
        final var factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        final var spec = new PBEKeySpec(masterKey, salt, iterations, keyLength);
        final var tmp = factory.generateSecret(spec);
        derivedKey = new SecretKeySpec(tmp.getEncoded(), "AES");

        secureRandom = new SecureRandom();
    }

    @NotNull
    public Cipher getEncryptCipher(@NotEmpty
                                   byte[] iv) throws GeneralSecurityException {
        final var cipher = Cipher.getInstance(cipherAlgorithm);
        cipher.init(Cipher.ENCRYPT_MODE, derivedKey, new IvParameterSpec(iv));
        return cipher;
    }

    @NotNull
    public Cipher getDecryptCipher(@NotEmpty
                                   byte[] iv) throws GeneralSecurityException {
        final var cipher = Cipher.getInstance(cipherAlgorithm);
        cipher.init(Cipher.DECRYPT_MODE, derivedKey, new IvParameterSpec(iv));
        return cipher;
    }

    @Positive
    public int getIvLength() {
        return applicationStorage.encryptionIvLength();
    }

    @NotEmpty
    public byte[] generateIv() {
        final var iv = new byte[applicationStorage.encryptionIvLength()];
        secureRandom.nextBytes(iv);
        return iv;
    }
}
