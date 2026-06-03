package com.oppshan.files.migration;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationState;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;

@QuarkusTest
class FlywayMigrationTest {

    private static final String MIGRATIONS_CLASSPATH_LOCATION = "db/migration/postgresql";

    private static final Pattern VERSIONED_MIGRATION_FILENAME = Pattern.compile("^V\\d+__.+\\.sql$");

    @Inject
    Flyway flyway;

    @Test
    void shouldHaveAppliedEveryVersionedMigrationSuccessfully() throws IOException {
        final var classpathFilenames = listClasspathVersionedMigrationFilenames();
        final var info = flyway.info();
        final var appliedMigrations = Arrays.asList(info.applied());
        final var pendingMigrations = Arrays.asList(info.pending());

        assertThat("Versioned migration files must exist on the classpath",
                classpathFilenames.size(), is(greaterThan(0)));

        assertThat("No migration may be pending after migrate-at-start",
                pendingMigrations, is(empty()));

        assertThat("Applied migration count must match versioned files on the classpath",
                appliedMigrations.size(), is(equalTo(classpathFilenames.size())));

        for (final var migration : appliedMigrations) {
            final var label = "V" + migration.getVersion() + "__" + migration.getDescription();
            assertThat(label + " must have SUCCESS state",
                    migration.getState(), is(equalTo(MigrationState.SUCCESS)));
        }
    }

    private static List<String> listClasspathVersionedMigrationFilenames() throws IOException {
        final var resourceUrl = FlywayMigrationTest.class.getClassLoader().getResource(MIGRATIONS_CLASSPATH_LOCATION);
        if (resourceUrl == null) {
            throw new IllegalStateException(
                    "Classpath resource " + MIGRATIONS_CLASSPATH_LOCATION + " is missing"
            );
        }
        try (final var stream = Files.list(Path.of(URI.create(resourceUrl.toString())))) {
            return stream
                    .map(path -> path.getFileName().toString())
                    .filter(name -> VERSIONED_MIGRATION_FILENAME.matcher(name).matches())
                    .sorted()
                    .toList();
        }
    }
}