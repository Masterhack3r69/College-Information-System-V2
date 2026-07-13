# Detailed Security Analysis: Spring Boot Authorization and Authentication

This report provides a comprehensive overview of the existing security architecture, user authentication, role/permission configurations, and endpoint/method protection mechanisms within the College Information System (CIS) Spring Boot Java codebase.

---

## 1. Spring Security Architecture & Configuration

Spring Security configurations are centralized in the project, facilitating stateless, token-based authentication (JWT) and method-level authorization.

### Central Security Configuration
- **File Path:** `src/main/java/com/school/sis/common/security/SecurityConfig.java`
- **Annotations:**
  - `@Configuration`: Marks the class as a source of bean definitions.
  - `@EnableMethodSecurity`: Enables method-level security processing (e.g., `@PreAuthorize`).
  - `@EnableConfigurationProperties(JwtProperties.class)`: Binds JWT configuration properties (secret keys, expiration times).

### Key Beans Registered in `SecurityConfig.java`
1. **`SecurityFilterChain securityFilterChain(HttpSecurity http, ...)`**:
   - **CSRF:** Disabled (`.csrf(AbstractHttpConfigurer::disable)`).
   - **CORS:** Enabled and bound to a custom `CorsConfigurationSource` matching `/api/**` with origins injected from the property `sis.cors.allowed-origins`.
   - **Session Management:** Stateless (`SessionCreationPolicy.STATELESS`), meaning sessions are not stored in memory on the server side.
   - **Request-Level Authorization:**
     - Permitted endpoints (Public): `/api/v1/auth/login` and `/api/v1/auth/refresh`.
     - Protected endpoints: All other requests under `/api/**` require authentication (`.anyRequest().authenticated()`).
   - **Exceptions Handling:**
     - `AuthenticationEntryPoint` returns HTTP 401 Unauthorized with JSON body: `ApiResponse.failure("Authentication required")`.
     - `AccessDeniedHandler` returns HTTP 403 Forbidden with JSON body: `ApiResponse.failure("Access denied")`.
   - **Filters:** Adds `JwtAuthenticationFilter` prior to Spring Security's `UsernamePasswordAuthenticationFilter`.
2. **`AuthenticationProvider authenticationProvider(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder)`**:
   - Registers a `DaoAuthenticationProvider` backed by the custom `SisUserDetailsService` and `BCryptPasswordEncoder`.
3. **`AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)`**:
   - Standard configuration manager bean.
4. **`PasswordEncoder passwordEncoder()`**:
   - Returns a `BCryptPasswordEncoder` bean for hashing and verifying passwords.

---

## 2. JWT Authentication Mechanism

Authentication utilizes JSON Web Tokens (JWT) for secure, stateless requests.

### Authentication Flow
1. **Login & Token Generation:**
   - Public access to `/api/v1/auth/login` maps to `AuthController.java` -> `AuthService.java`.
   - User credentials (username or email) and password are authenticated using the `AuthenticationManager`.
   - If successful, `JwtService.java` generates an access token.
   - A refresh token is generated via a random 48-byte secure token (Base64 URL-encoded) and saved to the database (`refresh_tokens` table) mapping to the user with an expiration time.
   - Response contains the access token, refresh token, access token duration, and a user profile summary (username, email, roles, permissions).
2. **Interception (Filter Chain):**
   - **File Path:** `src/main/java/com/school/sis/auth/security/JwtAuthenticationFilter.java`
   - Intercepts requests by checking for the `Authorization` header prefixed with `Bearer `.
   - Extract the token and queries `JwtService` to parse the `subject` (username).
   - If a username is retrieved and the context is unauthenticated, it loads the `UserDetails` from `SisUserDetailsService`.
   - Validates the token against the user's credentials and expiration.
   - Populates Spring Security's `SecurityContextHolder` with a `UsernamePasswordAuthenticationToken` using the user's loaded authorities.

---

## 3. User Details, Roles, and Permissions

User privileges are structured hierarchically through roles containing granular permissions.

### User Details Mapping
- **File Path:** `src/main/java/com/school/sis/auth/security/SisUserDetails.java`
- Maps database JPA entities to Spring Security's `UserDetails`.
- **`getAuthorities()` logic:**
  - Standardizes role names by prefixing them with `ROLE_` (e.g. `ROLE_SUPER_ADMIN`).
  - Maps role-associated permission names directly to Spring's `SimpleGrantedAuthority` (e.g. `STUDENT_VIEW`).
  - Merges roles and permission authorities dynamically into a single distinct collection.

### Database Definitions (Flyway Migrations)
Roles and permissions are initialized and updated through SQL migration scripts under `src/main/resources/db/migration/`:

#### **Defined Roles**
- `SUPER_ADMIN` ('00000000-0000-0000-0000-000000000201')
- `REGISTRAR` ('00000000-0000-0000-0000-000000000202')
- `DEAN` ('00000000-0000-0000-0000-000000000203')
- `PROGRAM_HEAD` ('00000000-0000-0000-0000-000000000204')
- `FACULTY` ('00000000-0000-0000-0000-000000000205')
- `CASHIER` ('00000000-0000-0000-0000-000000000206')
- `STUDENT` ('00000000-0000-0000-0000-000000000207')
- `READ_ONLY_STAFF` ('00000000-0000-0000-0000-000000000208')

#### **Defined Permissions & Mappings**
| Migration | Permission Name | Description | Assigned Roles |
| :--- | :--- | :--- | :--- |
| **V1** | `USER_MANAGE` | Can manage system users | `SUPER_ADMIN` |
| **V1** | `ACADEMIC_SETUP_VIEW` | Can view academic setup records | `SUPER_ADMIN`, `REGISTRAR`, `FACULTY`, `CASHIER`, `READ_ONLY_STAFF` |
| **V1** | `ACADEMIC_SETUP_MANAGE` | Can manage academic setup records | `SUPER_ADMIN`, `REGISTRAR` |
| **V1** | `STUDENT_CREATE` | Can create student profiles | `SUPER_ADMIN`, `REGISTRAR` |
| **V1** | `STUDENT_UPDATE` | Can update student profiles | `SUPER_ADMIN`, `REGISTRAR` |
| **V1** | `STUDENT_VIEW` | Can view student records | `SUPER_ADMIN`, `REGISTRAR`, `DEAN`, `PROGRAM_HEAD`, `READ_ONLY_STAFF` |
| **V1** | `ENROLLMENT_CREATE` | Can create enrollment records | `SUPER_ADMIN`, `REGISTRAR` |
| **V1** | `ENROLLMENT_APPROVE` | Can approve enrollment | `SUPER_ADMIN`, `REGISTRAR` |
| **V1** | `GRADE_ENCODE` | Can encode grades | `SUPER_ADMIN`, `FACULTY` |
| **V1** | `GRADE_APPROVE` | Can approve and lock grades | `SUPER_ADMIN`, `REGISTRAR` |
| **V1** | `FEE_MANAGE` | Can manage fee setup | `SUPER_ADMIN` *(Note: deleted from CASHIER in V11)* |
| **V1** | `REPORT_GENERATE` | Can generate reports | `SUPER_ADMIN`, `REGISTRAR` |
| **V1** | `AUDIT_VIEW` | Can view audit logs | `SUPER_ADMIN` |
| **V2** | `CURRICULUM_VIEW` | Can view curriculum records | `SUPER_ADMIN`, `REGISTRAR`, `DEAN`, `PROGRAM_HEAD` |
| **V2** | `CURRICULUM_MANAGE` | Can manage curriculum records | `SUPER_ADMIN`, `REGISTRAR` |
| **V4** | `SCHEDULE_VIEW` | Can view class schedules | `SUPER_ADMIN`, `REGISTRAR`, `DEAN`, `PROGRAM_HEAD`, `FACULTY` |
| **V4** | `SCHEDULE_MANAGE` | Can manage class schedules | `SUPER_ADMIN`, `REGISTRAR` |
| **V5** | `ENROLLMENT_VIEW` | Can view enrollment records | `SUPER_ADMIN`, `REGISTRAR`, `DEAN`, `PROGRAM_HEAD`, `FACULTY` |
| **V11** | `FINANCE_VIEW` | Can view assessments & payments | `SUPER_ADMIN`, `CASHIER` |
| **V11** | `FINANCE_PAYMENT` | Can record or void payments | `SUPER_ADMIN`, `CASHIER` |
| **V12** | `GRADE_REVIEW` | Review & return gradebooks | `SUPER_ADMIN`, `DEAN` |
| **V12** | `GRADE_LOCK` | Lock approved gradebooks | `SUPER_ADMIN`, `REGISTRAR` |

---

## 4. Protection Mechanisms

Security policies are enforced using declarative annotations and dynamic business logic validation inside the service layers.

### 4.1 Declarative Security (Annotations)
Annotations protect controller classes and REST endpoints directly using `@PreAuthorize`.

- **Class-Level Protection:**
  - Enforces authority constraints across all class methods.
  - *Example:* `@PreAuthorize("hasAuthority('USER_MANAGE')")` at the class-level of `UserAdministrationController.java`.
- **Method-Level Protection:**
  - Imposed on specific handler mappings to isolate retrieve vs mutation operations.
  - *Examples:*
    - `StudentController.java`:
      - `@GetMapping` uses `@PreAuthorize("hasAuthority('STUDENT_VIEW')")`
      - `@PostMapping` uses `@PreAuthorize("hasAuthority('STUDENT_CREATE')")`
      - `@PutMapping` uses `@PreAuthorize("hasAuthority('STUDENT_UPDATE')")`
    - `GradebookController.java`:
      - `@PostMapping("/class/{scheduleId}/initialize")` uses `@PreAuthorize("hasAuthority('GRADE_ENCODE')")`
      - `@PostMapping("/class/{scheduleId}/approve")` uses `@PreAuthorize("hasAuthority('GRADE_REVIEW')")`

### 4.2 Programmatic Security (Dynamic Service Validation)
In complex scenarios, roles/permissions constraints depend on runtime entity relationships (e.g., verifying if a faculty member owns a class gradebook). These are validated programmatically:

- **File Path:** `src/main/java/com/school/sis/grade/service/GradebookService.java`
- **Helper methods check Security Context authorities:**
  ```java
  private boolean has(SisUserDetails p, String a) {
      return p != null && p.getAuthorities().stream()
          .map(GrantedAuthority::getAuthority)
          .anyMatch(a::equals);
  }
  ```
- **Dynamic Scope Resolution (`allowedScope`):**
  - **`MY`:** Returns true if the principal matches the class faculty ID (`p.facultyId().equals(s.getFaculty().getId())`).
  - **`REVIEW`:** Enforces `GRADE_REVIEW` authority AND requires either `ROLE_SUPER_ADMIN` or that the dean/reviewer is assigned to the same department as the class's program section.
  - **`LOCK`:** Checks if the user holds `GRADE_LOCK` authority.
- **Access Enforcers:**
  - `ensureFaculty(ClassSchedule s, SisUserDetails p)`: Asserts the user has `GRADE_APPROVE` or `ROLE_SUPER_ADMIN`. If not, checks for `GRADE_ENCODE` and guarantees they are the assigned instructor (`p.facultyId()` matches schedule faculty).
  - `ensureReviewer(ClassSchedule s, SisUserDetails p)`: Checks that deans/reviewers only approve gradebooks within their own department.

---

## 5. Security Integration Tests

Authentication and authorization layers are verified integrationally using MockMvc.

- **File Path:** `src/test/java/com/school/sis/auth/UserAdministrationSecurityTests.java`
- **Mechanisms:**
  - Uses `@SpringBootTest` and `@AutoConfigureMockMvc`.
  - Simulates authenticated states using the `@WithMockUser` annotation with explicit authorities.
- **Test Scenarios Covered:**
  - Anonymous request verification: Asserts requests lacking headers throw HTTP 401 Unauthorized.
  - Insufficient authority validation: Asserts requests containing invalid authorities (e.g. `STUDENT_VIEW` requesting user listings) throw HTTP 403 Forbidden.
  - Successful authorization: Asserts requests containing correct authorities (e.g., `USER_MANAGE`) return HTTP 200 OK.
