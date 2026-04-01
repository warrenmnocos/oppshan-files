package com.oppshan.files;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.MatcherAssert.assertThat;

@QuarkusTest
class GreetingResourceTest {

    @Test
    void testHelloEndpoint() {
        assertThat(new GreetingResource().hello(), is("Hello from Quarkus REST"));
    }

}