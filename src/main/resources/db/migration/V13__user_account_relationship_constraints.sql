CREATE UNIQUE INDEX uq_users_faculty_id
    ON users(faculty_id)
    WHERE faculty_id IS NOT NULL;
