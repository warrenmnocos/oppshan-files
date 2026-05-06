package com.oppshan.files.file;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import com.google.common.base.MoreObjects;
import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.io.Serial;
import java.io.Serializable;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Valid
@RegisterForReflection
@JsonAutoDetect(
        fieldVisibility = Visibility.ANY,
        getterVisibility = Visibility.NONE,
        isGetterVisibility = Visibility.NONE,
        setterVisibility = Visibility.NONE
)
public class DirectoryContentsView implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @NotNull
    private final UUID uuid;

    @NotEmpty
    private final String name;

    private final UUID parentUuid;

    @NotNull
    private final List<@NotNull BreadcrumbView> breadcrumbViews;

    @NotNull
    private final List<@NotNull FileNodeView> childrenFileNodeViews;

    private final UUID targetFileUuid;

    public DirectoryContentsView(@NotNull
                                 UUID uuid,

                                 @NotEmpty
                                 String name,

                                 UUID parentUuid,

                                 @NotNull
                                 List<@NotNull BreadcrumbView> breadcrumbViews,

                                 @NotNull
                                 List<@NotNull FileNodeView> childrenFileNodeViews) {
        this(uuid, name, parentUuid, breadcrumbViews, childrenFileNodeViews, null);
    }

    public DirectoryContentsView(@NotNull
                                 UUID uuid,

                                 @NotEmpty
                                 String name,

                                 UUID parentUuid,

                                 @NotNull
                                 List<@NotNull BreadcrumbView> breadcrumbViews,

                                 @NotNull
                                 List<@NotNull FileNodeView> childrenFileNodeViews,

                                 UUID targetFileUuid) {
        this.uuid = Objects.requireNonNull(uuid);
        this.name = Objects.requireNonNull(name);
        this.parentUuid = parentUuid;
        this.breadcrumbViews = Objects.requireNonNullElse(breadcrumbViews, Collections.emptyList());
        this.childrenFileNodeViews = Objects.requireNonNullElse(childrenFileNodeViews, Collections.emptyList());
        this.targetFileUuid = targetFileUuid;
    }

    public UUID getUuid() {
        return uuid;
    }

    public String getName() {
        return name;
    }

    public Optional<UUID> getParentUuid() {
        return Optional.ofNullable(parentUuid);
    }

    public List<BreadcrumbView> getBreadcrumbViews() {
        return breadcrumbViews;
    }

    public List<FileNodeView> getChildrenFileNodeViews() {
        return childrenFileNodeViews;
    }

    public Optional<UUID> getTargetFileUuid() {
        return Optional.ofNullable(targetFileUuid);
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("uuid", uuid)
                .add("name", name)
                .add("parentUuid", parentUuid)
                .add("breadcrumbViews", breadcrumbViews)
                .add("childrenFileNodeViews", childrenFileNodeViews)
                .add("targetFileUuid", targetFileUuid)
                .toString();
    }
}
