package com.school.sis.setup;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class AcademicTermReferenceSecurityTests {
    @Autowired MockMvc mockMvc;

    @Test
    void anonymousUserCannotListAcademicTermReferences() throws Exception {
        mockMvc.perform(get("/api/v1/school-years")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/semesters")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    void authenticatedUserCanListAcademicTermReferences() throws Exception {
        mockMvc.perform(get("/api/v1/school-years")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/semesters")).andExpect(status().isOk());
    }
}
