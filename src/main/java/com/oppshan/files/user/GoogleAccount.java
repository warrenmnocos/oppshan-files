package com.oppshan.files.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.io.Serial;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "google_account",
        indexes = {
                @Index(name = "idx_google_account_name", columnList = "name"),
                @Index(name = "idx_google_account_email", columnList = "email"),
        })
public class GoogleAccount extends IdpAccount {

    @Serial
    private static final long serialVersionUID = 1L;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    @Column(name = "photo_url")
    private String photoUrl;

    @Override
    public GoogleAccount setId(Long id) {
        return (GoogleAccount) super.setId(id);
    }

    @Override
    public GoogleAccount setUuid(UUID uuid) {
        return (GoogleAccount) super.setUuid(uuid);
    }

    @Override
    public GoogleAccount setProviderId(String providerId) {
        return (GoogleAccount) super.setProviderId(providerId);
    }

    @Override
    public GoogleAccount setProviderName(String providerName) {
        return (GoogleAccount) super.setProviderName(providerName);
    }

    @Override
    public GoogleAccount setUserAccount(UserAccount userAccount) {
        return (GoogleAccount) super.setUserAccount(userAccount);
    }

    @Override
    public GoogleAccount setCreatedAt(Instant createdAt) {
        return (GoogleAccount) super.setCreatedAt(createdAt);
    }

    @Override
    public GoogleAccount setLastModifiedAt(Instant lastModifiedAt) {
        return (GoogleAccount) super.setLastModifiedAt(lastModifiedAt);
    }

    public String getName() {
        return name;
    }

    public GoogleAccount setName(String name) {
        this.name = name;
        return this;
    }

    public String getEmail() {
        return email;
    }

    public GoogleAccount setEmail(String email) {
        this.email = email;
        return this;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public GoogleAccount setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
        return this;
    }
}
