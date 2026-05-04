package com.oppshan.files.file;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import javax.crypto.Cipher;
import java.util.HashSet;
import java.util.Set;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class FileContentCipherServiceTest {

    @Inject
    FileContentCipherService fileContentCipherService;

    @Test
    void shouldRoundTripPlaintextWhenEncryptingThenDecrypting() throws Exception {
        final var iv = fileContentCipherService.generateIv();
        final var encryptCipher = fileContentCipherService.getEncryptCipher(iv);
        final var plaintext = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".getBytes();

        final var ciphertext = encryptCipher.doFinal(plaintext);
        assertThat(ciphertext, is(notNullValue()));
        assertThat(ciphertext.length, is(greaterThan(0)));

        final var decryptCipher = fileContentCipherService.getDecryptCipher(iv);
        final var decrypted = decryptCipher.doFinal(ciphertext);
        assertThat(decrypted, equalTo(plaintext));
    }

    @Test
    void shouldGenerateIvOfConfiguredLength() {
        final var iv = fileContentCipherService.generateIv();
        assertThat(iv.length, is(fileContentCipherService.getIvLength()));
    }

    @Test
    void shouldGenerateUniqueIvsAcrossSuccessiveCalls() {
        final Set<String> seenIvs = new HashSet<>();
        for (int generationIndex = 0; generationIndex < 256; generationIndex++) {
            final var generatedIv = fileContentCipherService.generateIv();
            seenIvs.add(java.util.Arrays.toString(generatedIv));
        }
        assertThat(seenIvs.size(), is(256));
    }

    @Test
    void shouldInitializeEncryptCipherInEncryptMode() throws Exception {
        final var iv = fileContentCipherService.generateIv();
        final var encryptCipher = fileContentCipherService.getEncryptCipher(iv);
        assertThat(encryptCipher.getAlgorithm(), is("AES/CTR/NoPadding"));
        assertCipherCanProcess(encryptCipher);
    }

    @Test
    void shouldInitializeDecryptCipherInDecryptMode() throws Exception {
        final var iv = fileContentCipherService.generateIv();
        final var decryptCipher = fileContentCipherService.getDecryptCipher(iv);
        assertThat(decryptCipher.getAlgorithm(), is("AES/CTR/NoPadding"));
        assertCipherCanProcess(decryptCipher);
    }

    @Test
    void shouldProduceDifferentCiphertextWhenIvsDifferForSamePlaintext() throws Exception {
        final var firstIv = fileContentCipherService.generateIv();
        final var secondIv = fileContentCipherService.generateIv();
        final var plaintext = "shared plaintext".getBytes();

        final var firstCiphertext = fileContentCipherService.getEncryptCipher(firstIv).doFinal(plaintext);
        final var secondCiphertext = fileContentCipherService.getEncryptCipher(secondIv).doFinal(plaintext);

        assertThat(java.util.Arrays.equals(firstCiphertext, secondCiphertext), is(false));
    }

    private static void assertCipherCanProcess(Cipher cipher) throws Exception {
        final var output = cipher.doFinal("probe".getBytes());
        assertThat(output.length, is(greaterThan(0)));
    }
}
