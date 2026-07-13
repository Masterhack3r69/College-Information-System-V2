package com.school.sis;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = {"spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true"})
class PostgresMigrationTests {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired JdbcTemplate jdbc;

    @Test void allMigrationsApplyAndHibernateValidates() {
        Integer count = jdbc.queryForObject("select count(*) from flyway_schema_history where success", Integer.class);
        String latest = jdbc.queryForObject("select version from flyway_schema_history order by installed_rank desc limit 1", String.class);
        assertThat(count).isEqualTo(13);
        assertThat(latest).isEqualTo("13");

        jdbc.update("insert into departments(id,department_code,department_name,status) values (?::uuid,?,?,?)",
                "10000000-0000-0000-0000-000000000001", "ACCOUNT-TEST", "Account Test", "ACTIVE");
        jdbc.update("""
                insert into faculty(id,employee_number,first_name,last_name,email,department_id,employment_status,faculty_type,status)
                values (?::uuid,?,?,?,?,?::uuid,?,?,?)
                """, "10000000-0000-0000-0000-000000000002", "ACCOUNT-1", "Account", "Faculty", "account-faculty@example.edu",
                "10000000-0000-0000-0000-000000000001", "FULL_TIME", "INSTRUCTOR", "ACTIVE");
        jdbc.update("insert into users(id,email,username,password_hash,full_name,active,faculty_id) values (?::uuid,?,?,?,?,?,?::uuid)",
                "10000000-0000-0000-0000-000000000003", "account-one@example.edu", "account-one", "hash", "Account One", true,
                "10000000-0000-0000-0000-000000000002");
        assertThatThrownBy(() -> jdbc.update("insert into users(id,email,username,password_hash,full_name,active,faculty_id) values (?::uuid,?,?,?,?,?,?::uuid)",
                "10000000-0000-0000-0000-000000000004", "account-two@example.edu", "account-two", "hash", "Account Two", true,
                "10000000-0000-0000-0000-000000000002"))
                .hasMessageContaining("uq_users_faculty_id");
        jdbc.update("insert into users(id,email,username,password_hash,full_name,active) values (?::uuid,?,?,?,?,?)",
                "10000000-0000-0000-0000-000000000005", "unlinked-one@example.edu", "unlinked-one", "hash", "Unlinked One", true);
        jdbc.update("insert into users(id,email,username,password_hash,full_name,active) values (?::uuid,?,?,?,?,?)",
                "10000000-0000-0000-0000-000000000006", "unlinked-two@example.edu", "unlinked-two", "hash", "Unlinked Two", true);
    }
}
