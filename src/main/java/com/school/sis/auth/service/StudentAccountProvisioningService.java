package com.school.sis.auth.service;

import com.school.sis.audit.service.AuditService;
import com.school.sis.auth.entity.User;
import com.school.sis.auth.repository.RoleRepository;
import com.school.sis.auth.repository.UserRepository;
import com.school.sis.common.exception.BusinessRuleException;
import com.school.sis.student.entity.Student;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;

@Service
public class StudentAccountProvisioningService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;
    private final boolean enabled;

    public StudentAccountProvisioningService(UserRepository users, RoleRepository roles, PasswordEncoder passwordEncoder,
                                             AuditService audit,
                                             @Value("${sis.student-account.provisioning-enabled:true}") boolean enabled) {
        this.users=users; this.roles=roles; this.passwordEncoder=passwordEncoder; this.audit=audit; this.enabled=enabled;
    }

    @Transactional
    public Result provision(Student student) {
        if (!enabled) return new Result(false, student.getStudentNumber(), null);
        var existing=users.findByStudentId(student.getId());
        if(existing.isPresent()) return new Result(false,existing.get().getUsername(),null);
        if(student.getContact()==null || student.getContact().getEmailAddress()==null || student.getContact().getEmailAddress().isBlank())
            throw new BusinessRuleException("A valid student contact email is required before enrollment confirmation");
        String email=student.getContact().getEmailAddress().trim().toLowerCase(Locale.ROOT);
        if(!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw new BusinessRuleException("Student contact email is invalid");
        if(users.findByEmailIgnoreCaseOrUsernameIgnoreCase(email,email).isPresent()) throw new BusinessRuleException("Student contact email is already used by another account");
        if(users.findByEmailIgnoreCaseOrUsernameIgnoreCase(student.getStudentNumber(),student.getStudentNumber()).isPresent())
            throw new BusinessRuleException("Student number is already used by another account");
        var role=roles.findByName("STUDENT").orElseThrow(()->new BusinessRuleException("STUDENT role is not configured"));
        User user=new User(); user.setEmail(email); user.setUsername(student.getStudentNumber());
        user.setFullName(String.join(" ",java.util.stream.Stream.of(student.getFirstName(),student.getMiddleName(),student.getLastName(),student.getSuffix()).filter(v->v!=null&&!v.isBlank()).toList()));
        user.setPasswordHash(passwordEncoder.encode(student.getStudentNumber())); user.setActive(true); user.setStudent(student);
        user.setMustChangePassword(true); user.getRoles().add(role); users.save(user);
        audit.log(user,"STUDENT_ACCOUNT_PROVISIONED","AUTH","Student",student.getId(),null,Map.of("username",user.getUsername()));
        return new Result(true,user.getUsername(),student.getStudentNumber());
    }

    public record Result(boolean created,String username,String initialPassword) {}
}
