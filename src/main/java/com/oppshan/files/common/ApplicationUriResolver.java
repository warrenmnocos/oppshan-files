package com.oppshan.files.common;

import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public enum ApplicationUriResolver {

    HOME(""),
    SSO(ApplicationUriResolver.HOME, "sso"),
    API(ApplicationUriResolver.HOME, "api"),
    API_ME(ApplicationUriResolver.API, "me"),
    SSO_SIGN_IN(ApplicationUriResolver.SSO, "sign-in"),
    SSO_SIGN_OUT(ApplicationUriResolver.SSO, "sign-out"),
    SSO_SIGN_IN_OIDC(ApplicationUriResolver.SSO_SIGN_IN, "oidc"),
    ;

    private final String value;

    private final ApplicationUriResolver parent;

    private final URI uri;

    private final List<ApplicationUriResolver> path;

    ApplicationUriResolver(ApplicationUriResolver parent,
                           String value) {
        this.value = value;
        this.parent = parent;
        path = Stream.iterate(
                        this,
                        current -> current.parent != null,
                        current -> current.parent
                )
                .collect(Collectors.collectingAndThen(
                        Collectors.toList(),
                        applicationUriResolvers -> {
                            Collections.reverse(applicationUriResolvers);
                            return applicationUriResolvers;
                        }
                ));
        this.uri = path.stream()
                .map(ApplicationUriResolver::getValue)
                .collect(Collectors.collectingAndThen(
                        Collectors.joining("/", "/", ""),
                        URI::create
                ));
    }

    ApplicationUriResolver(String value) {
        this.value = value;
        this.parent = null;
        this.uri = URI.create(this.value);
        path = Collections.emptyList();
    }

    public String getValue() {
        return value;
    }

    public URI getUri() {
        return uri;
    }

    public String getUriString() {
        return uri.toString();
    }

    public Iterable<ApplicationUriResolver> getPath() {
        return path;
    }
}
