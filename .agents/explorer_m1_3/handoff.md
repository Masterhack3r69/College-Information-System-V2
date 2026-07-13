# Handoff Report: Security Investigation (Authorization and Authentication)

## 1. Observation

Direct observations from searching and inspecting the College Information System (CIS) codebase:

- **Spring Security Configuration:**
  - Located in `src/main/java/com/school/sis/common/security/SecurityConfig.java`.
  - Enables method-level security processing at line 34: `@EnableMethodSecurity`.
  - Configures route-level access rules (permitting login/refresh and requiring authentication for all other endpoints) at lines 49–52:
    ```java
    .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
            .anyRequest().authenticated()
    )
    ```
  - Integrates `JwtAuthenticationFilter` prior to standard authentication filters at line 66:
    ```java
    .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
    ```

- **JWT Authentication Filter:**
  - Located in `src/main/java/com/school/sis/auth/security/JwtAuthenticationFilter.java`.
  - Extends standard filter structure at line 17: `public class JwtAuthenticationFilter extends OncePerRequestFilter`.
  - Validates `Authorization` header at lines 30-31: `String header = request.getHeader("Authorization"); if (header == null || !header.startsWith("Bearer "))`.
  - Populates Spring context upon token verification at line 50: `SecurityContextHolder.getContext().setAuthentication(authentication);`.

- **User Authority Resolution:**
  - Located in `src/main/java/com/school/sis/auth/security/SisUserDetails.java`.
  - Maps JPA entities (`User`, `Role`, `Permission`) to Granted Authorities at lines 37-46:
    ```java
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return user.getRoles().stream()
                .flatMap(role -> Stream.concat(
                        Stream.of(new SimpleGrantedAuthority("ROLE_" + role.getName())),
                        role.getPermissions().stream()
                                .map(permission -> new SimpleGrantedAuthority(permission.getName()))
                ))
                .distinct()
                .toList();
    }
    ```

- **Database Mappings (Flyway Migration Scripts):**
  - Roles and Permissions are defined in `src/main/resources/db/migration/V1__foundation_auth_and_setup.sql`, `V2__curriculum_management.sql`, `V4__schedule_management.sql`, `V5__enrollment_management.sql`, `V11__finance_payments_and_permissions.sql`, and `V12__weighted_gradebooks.sql`.
  - Core roles: `SUPER_ADMIN`, `REGISTRAR`, `DEAN`, `PROGRAM_HEAD`, `FACULTY`, `CASHIER`, `STUDENT`, `READ_ONLY_STAFF`.
  - Granular permissions: `USER_MANAGE`, `ACADEMIC_SETUP_VIEW`, `ACADEMIC_SETUP_MANAGE`, `STUDENT_CREATE`, `STUDENT_UPDATE`, `STUDENT_VIEW`, `ENROLLMENT_CREATE`, `ENROLLMENT_APPROVE`, `GRADE_ENCODE`, `GRADE_APPROVE`, `REPORT_GENERATE`, `AUDIT_VIEW`, `CURRICULUM_VIEW`, `CURRICULUM_MANAGE`, `SCHEDULE_VIEW`, `SCHEDULE_MANAGE`, `ENROLLMENT_VIEW`, `FINANCE_VIEW`, `FINANCE_PAYMENT`, `GRADE_REVIEW`, `GRADE_LOCK`.

- **Endpoint Declarative Protection:**
  - Controllers employ `@PreAuthorize` to assert required permissions.
  - Class-level constraint in `UserAdministrationController.java` line 16: `@PreAuthorize("hasAuthority('USER_MANAGE')")`.
  - Method-level constraint in `StudentController.java` line 47: `@PreAuthorize("hasAuthority('STUDENT_VIEW')")`.

- **Service-Level Programmatic Protection:**
  - Found in `src/main/java/com/school/sis/grade/service/GradebookService.java`.
  - Dynamic verification of authorities and domain relational rules at lines 25–26:
    ```java
    private boolean allowedScope(String scope,ClassSchedule s,SisUserDetails p){
        if("MY".equalsIgnoreCase(scope)) return p!=null&&p.facultyId()!=null&&p.facultyId().equals(s.getFaculty().getId());
        if("REVIEW".equalsIgnoreCase(scope)){
            if(!has(p,"GRADE_REVIEW"))return false;
            User u=user(p);
            return has(p,"ROLE_SUPER_ADMIN")||(u!=null&&u.getFaculty()!=null&&u.getFaculty().getDepartment().getId().equals(s.getSection().getProgram().getDepartment().getId()));
        }
        return "LOCK".equalsIgnoreCase(scope)&&has(p,"GRADE_LOCK");
    }
    ```

- **Security Testing:**
  - Configured in `src/test/java/com/school/sis/auth/UserAdministrationSecurityTests.java`.
  - Utilizes standard mock annotations to mock users and confirm authorization boundaries: `@Test @WithMockUser(authorities = "STUDENT_VIEW")`.

## 2. Logic Chain

1. **Route Filter Configuration:** By defining `.requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh").permitAll().anyRequest().authenticated()` in `SecurityConfig.java`, all endpoints except auth login/refresh are locked down by default.
2. **Stateless JWT Validation:** When a requests arrives, `JwtAuthenticationFilter` intercepts it. If a valid JWT token is provided in the header, the filter parses it using `JwtService` and loads the user's role-permission mapping from the database using `SisUserDetailsService`. It then registers the authenticated context in `SecurityContextHolder`.
3. **Authority Construction:** The `SisUserDetails.getAuthorities()` constructs both role-based (prefixed with `ROLE_`) and permission-based authorities (e.g. `ROLE_FACULTY`, `GRADE_ENCODE`). This allows Spring Security to evaluate these strings.
4. **Access Control Enforcement:** 
   - Declarative checks like `@PreAuthorize("hasAuthority('USER_MANAGE')")` match against these constructed authorities.
   - Programmatic checks like `has(p, "GRADE_REVIEW")` inside `GradebookService` verify the authority directly, combined with business logic (e.g., verifying department ownership) to provide deep domain security.
5. **Testing Verification:** Using `@WithMockUser(authorities = "STUDENT_VIEW")`, the test suite confirms that unauthorized requests generate HTTP 403 Forbidden responses, proving the enforcement is working correctly.

## 3. Caveats

- **Frontend Handling:** The scope of this investigation was restricted to the backend Spring Boot Java codebase; frontend token storage mechanisms (such as localStorage vs cookies) or external client integration details were not investigated.
- **External Auth:** There are no social logins (OAuth2, OIDC) or third-party authentication services configured in the Spring Security chain. The current authentication is strictly database-driven.

## 4. Conclusion

The College Information System uses a standard Spring Security 6 stateless architecture utilizing JSON Web Tokens.
- Authentication relies on the custom `JwtAuthenticationFilter` and `JwtService`.
- Authorization is role-permission-based: database entries define role memberships and role-to-permission mappings.
- Endpoints are protected declaratively using class/method-level `@PreAuthorize` annotations, supplemented by programmatic relationship checks in the service layer (e.g. `GradebookService.java`) for contextual access control.

## 5. Verification Method

To independently verify this security configuration:
1. **Run Security Unit Tests:**
   Execute the Maven test command targeting the user administration security tests:
   ```cmd
   mvn test -Dtest=UserAdministrationSecurityTests
   ```
2. **Inspect the Key Code files:**
   - Verify Security Filter rules: `src/main/java/com/school/sis/common/security/SecurityConfig.java`
   - Verify Authority Construction: `src/main/java/com/school/sis/auth/security/SisUserDetails.java`
   - Verify Programmatic Checks: `src/main/java/com/school/sis/grade/service/GradebookService.java`
