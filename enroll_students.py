import subprocess
import json
import uuid
import requests
import sys
import csv
import io

# Database helper functions using docker-exec psql
def run_sql(sql):
    cmd = ["docker", "compose", "exec", "-T", "postgres", "psql", "-U", "sis_user", "-d", "sis_db", "-c", sql]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"SQL failed: {result.stderr}\nCommand: {sql}")
    return result.stdout

def query_json(sql):
    cmd = ["docker", "compose", "exec", "-T", "postgres", "psql", "-U", "sis_user", "-d", "sis_db", "--csv", "-c", sql]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"SQL query failed: {result.stderr}\nCommand: {sql}")
    
    f = io.StringIO(result.stdout.strip())
    reader = csv.DictReader(f)
    records = []
    for row in reader:
        if "year_level" in row and row["year_level"]:
            try:
                row["year_level"] = int(row["year_level"])
            except ValueError:
                pass
        if "credit_units" in row and row["credit_units"]:
            try:
                row["credit_units"] = float(row["credit_units"])
            except ValueError:
                pass
        records.append(row)
    return records

# REST API Base URL
BASE_URL = "http://localhost:8080/api/v1"

def login():
    payload = {
        "usernameOrEmail": "admin",
        "password": "admin123"
    }
    r = requests.post(f"{BASE_URL}/auth/login", json=payload)
    r.raise_for_status()
    resp = r.json()
    token = resp["data"]["accessToken"]
    print("Logged in successfully as admin.")
    return token

def create_section(token, section_code, year_level, sy_id, sem_id):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Check if section already exists
    r = requests.get(f"{BASE_URL}/sections?search={section_code}", headers=headers)
    r.raise_for_status()
    sections = r.json()["data"]["items"]
    for sec in sections:
        if sec["sectionCode"] == section_code:
            print(f"Section {section_code} already exists.")
            return sec["id"]
            
    # Create section
    payload = {
        "sectionCode": section_code,
        "programId": "c4f4ab47-33fe-4be6-bb07-8ccc58752499", # BSIT
        "curriculumId": "5e5c3e07-d486-4f3d-976e-7e806739c29f", # BSIT-2026
        "schoolYearId": sy_id,
        "semesterId": sem_id,
        "yearLevel": year_level,
        "status": "ACTIVE"
    }
    r = requests.post(f"{BASE_URL}/sections", json=payload, headers=headers)
    r.raise_for_status()
    new_sec = r.json()["data"]
    print(f"Section {section_code} created: {new_sec['id']}")
    return new_sec["id"]

def create_schedule(token, section_id, course_id, day, start_time, end_time):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    payload = {
        "sectionId": section_id,
        "courseId": course_id,
        "facultyId": "cb88cbd7-81b1-468a-b384-978cc2e3d7ca", # Jean Doe
        "roomId": "a3953283-fc91-4710-937a-4cb033ce2f55",    # Room 003
        "capacity": 40,
        "status": "ACTIVE",
        "meetings": [
            {
                "dayOfWeek": day,
                "startTime": start_time,
                "endTime": end_time
            }
        ]
    }
    r = requests.post(f"{BASE_URL}/schedules", json=payload, headers=headers)
    if r.status_code == 400:
        print(f"Error creating schedule for course {course_id}: {r.text}")
    r.raise_for_status()
    sched = r.json()["data"]
    return sched["id"]

def main():
    token = login()
    
    # 1. Ensure prior school years exist in DB
    print("Setting up prior school years...")
    run_sql("""
    INSERT INTO school_years (id, school_year, active, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000000301', '2023-2024', false, now(), now()),
    ('00000000-0000-0000-0000-000000000302', '2024-2025', false, now(), now()),
    ('00000000-0000-0000-0000-000000000303', '2025-2026', false, now(), now())
    ON CONFLICT (school_year) DO NOTHING;
    """)
    
    active_sy_id = "4ea67fb8-384d-41b4-9e0a-06eab3c90896" # 2026-2027
    active_sem_id = "00000000-0000-0000-0000-000000000401" # FIRST SEMESTER
    
    # 2. Check/create sections for all 4 years
    print("Creating/checking sections...")
    sec_ids = {}
    sec_ids[1] = "dd16acb4-fa13-4309-9703-43088c2d1749" # BSIT-1A already exists
    sec_ids[2] = "6bd821ad-ae92-45f5-b027-a85ff261d2c4" # BSIT-2A already exists
    sec_ids[3] = create_section(token, "BSIT-3A", 3, active_sy_id, active_sem_id)
    sec_ids[4] = create_section(token, "BSIT-4A", 4, active_sy_id, active_sem_id)
    
    # 3. Create active class schedules for Year 2, 3, 4 courses in their respective sections
    print("Setting up class schedules for Year 2, 3, 4...")
    # Fetch first semester courses for BSIT curriculum
    courses_query = """
        SELECT cc.year_level, cc.course_id, c.course_code 
        FROM curriculum_courses cc 
        JOIN courses c ON cc.course_id = c.id 
        WHERE cc.curriculum_id = '5e5c3e07-d486-4f3d-976e-7e806739c29f' 
          AND cc.semester = 'FIRST_SEMESTER'
    """
    courses = query_json(courses_query)
    
    # Group courses by year level
    courses_by_year = {1: [], 2: [], 3: [], 4: []}
    for c in courses:
        courses_by_year[c["year_level"]].append(c)
        
    # We will check or create schedules for Years 2, 3, and 4
    days = {2: "MONDAY", 3: "TUESDAY", 4: "WEDNESDAY"}
    
    # Let's map course to schedule ID
    schedule_ids = {}
    
    # Get existing schedules first
    existing_scheds = query_json("SELECT id, section_id, course_id FROM class_schedules WHERE status = 'ACTIVE';")
    for s in existing_scheds:
        schedule_ids[(s["section_id"], s["course_id"])] = s["id"]
        
    for yr in [2, 3, 4]:
        sec_id = sec_ids[yr]
        day = days[yr]
        yr_courses = courses_by_year[yr]
        print(f"Year {yr} courses to schedule: {[c['course_code'] for c in yr_courses]}")
        
        for i, c in enumerate(yr_courses):
            c_id = c["course_id"]
            if (sec_id, c_id) in schedule_ids:
                print(f"Schedule for {c['course_code']} in section {yr} already exists.")
                continue
                
            # Define non-overlapping time slot
            start_hour = 8 + i
            if start_hour >= 12:
                start_hour += 1
            start_time = f"{start_hour:02d}:00:00"
            end_time = f"{(start_hour+1):02d}:00:00"
            
            print(f"Creating schedule for {c['course_code']} on {day} {start_time}-{end_time}...")
            sched_id = create_schedule(token, sec_id, c_id, day, start_time, end_time)
            schedule_ids[(sec_id, c_id)] = sched_id

    # 4. Generate realistic mock data for 19 applicant students
    print("Generating student profiles template...")
    student_templates = []
    
    year_levels = [1]*4 + [2]*5 + [3]*5 + [4]*5
    
    first_names = [
        "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
        "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen"
    ]
    last_names = [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
        "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"
    ]
    
    for i, yl in enumerate(year_levels):
        student_num = f"2026-MIG-{i+1:04d}"
        email = f"mig.student{i+1}@sis.local"
        first = first_names[i]
        last = last_names[i]
        gender = "MALE" if i % 2 == 0 else "FEMALE"
        birth_year = 2008 - yl
        birthdate = f"{birth_year}-05-15"
        
        student_templates.append({
            "yl": yl,
            "student_num": student_num,
            "payload": {
                "personal": {
                    "studentNumber": student_num,
                    "firstName": first,
                    "lastName": last,
                    "middleName": "A",
                    "suffix": "",
                    "gender": gender,
                    "birthdate": birthdate,
                    "birthplace": "Manila",
                    "civilStatus": "SINGLE",
                    "nationality": "Filipino",
                    "religion": "Catholic",
                    "profilePhotoPath": "",
                    "status": "APPLICANT"
                },
                "contact": {
                    "emailAddress": email,
                    "mobileNumber": f"0917000{i+1:04d}",
                    "telephoneNumber": "",
                    "currentAddress": "Manila",
                    "permanentAddress": "Manila",
                    "emergencyContactName": "Parent " + last,
                    "emergencyContactNumber": "09179990001",
                    "emergencyContactRelationship": "Father",
                    "emergencyContactAddress": "Manila"
                },
                "family": {
                    "fatherName": "Father " + last,
                    "fatherOccupation": "Employee",
                    "fatherContactNumber": "09179990001",
                    "motherName": "Mother " + last,
                    "motherOccupation": "Housewife",
                    "motherContactNumber": "09179990002",
                    "householdIncomeRange": "PHP 20,000 - 40,000"
                },
                "educational": {
                    "elementarySchoolName": "Elem School",
                    "juniorHighSchoolName": "JHS School",
                    "seniorHighSchoolName": "SHS School",
                    "admissionType": "NEW_STUDENT" if yl == 1 else "CONTINUING_STUDENT"
                },
                "academic": {
                    "programId": "c4f4ab47-33fe-4be6-bb07-8ccc58752499", # BSIT
                    "curriculumId": "5e5c3e07-d486-4f3d-976e-7e806739c29f", # BSIT-2026
                    "yearLevel": yl,
                    "dateAdmitted": "2026-06-01",
                    "schoolYearAdmitted": "2026-2027",
                    "classification": "REGULAR",
                    "academicStatus": "REGULAR"
                }
            }
        })
        
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # 5. Create student profiles via REST API
    print("Creating/loading student profiles...")
    student_ids = {}
    for idx, template in enumerate(student_templates):
        yl = template["yl"]
        payload = template["payload"]
        student_num = template["student_num"]
        
        # Check if student already exists
        r = requests.get(f"{BASE_URL}/students?search={student_num}", headers=headers)
        r.raise_for_status()
        students_found = r.json()["data"]["items"]
        student_id = None
        for s in students_found:
            if s["studentNumber"] == student_num:
                student_id = s["id"]
                print(f"Student {student_num} already exists with ID: {student_id}")
                break
                
        if not student_id:
            r = requests.post(f"{BASE_URL}/students", json=payload, headers=headers)
            r.raise_for_status()
            student_id = r.json()["data"]["personal"]["id"]
            print(f"Student profile created: {student_id}")
            
        student_ids[student_num] = student_id
        template["id"] = student_id

    # 6. Batch seed prior grades for upperclass students in database using SQL
    print("Generating batch SQL for prior grades...")
    sql_batch = []
    
    # Fetch all curriculum courses to build schedule/prerequisite lookups
    all_cc_query = """
        SELECT cc.year_level, cc.semester, cc.course_id, c.course_code, c.course_title, c.credit_units 
        FROM curriculum_courses cc 
        JOIN courses c ON cc.course_id = c.id 
        WHERE cc.curriculum_id = '5e5c3e07-d486-4f3d-976e-7e806739c29f'
        ORDER BY cc.year_level, cc.semester
    """
    all_cc = query_json(all_cc_query)
    
    # Pre-load existing class schedules in DB
    existing_scheds = {
        (s["course_id"], s["school_year_id"], s["semester_id"], s["section_id"]): s["id"] 
        for s in query_json("SELECT id, course_id, school_year_id, semester_id, section_id FROM class_schedules;")
    }
    
    # Pre-load existing enrollments in DB
    existing_enrolls = {
        (e["student_id"], e["school_year_id"], e["semester_id"]): e["id"] 
        for e in query_json("SELECT id, student_id, school_year_id, semester_id FROM enrollments;")
    }
    
    # Pre-load existing enrollment subjects in DB
    existing_subjs = {
        (es["enrollment_id"], es["class_schedule_id"]): es["id"]
        for es in query_json("SELECT id, enrollment_id, class_schedule_id FROM enrollment_subjects;")
    }
    
    # Pre-load existing grades in DB
    existing_grades = {
        g["enrollment_subject_id"]: g["id"]
        for g in query_json("SELECT id, enrollment_subject_id FROM grades;")
    }
    
    # Pre-load existing academic records in DB
    existing_ar = {
        ar["grade_id"]: ar["id"]
        for ar in query_json("SELECT id, grade_id FROM academic_records;")
    }

    school_year_mapping = {
        2: {1: "2025-2026"},
        3: {1: "2024-2025", 2: "2025-2026"},
        4: {1: "2023-2024", 2: "2024-2025", 3: "2025-2026"}
    }
    
    sy_ids = {
        "2023-2024": "00000000-0000-0000-0000-000000000301",
        "2024-2025": "00000000-0000-0000-0000-000000000302",
        "2025-2026": "00000000-0000-0000-0000-000000000303"
    }
    
    sem_ids = {
        "FIRST_SEMESTER": "00000000-0000-0000-0000-000000000401",
        "SECOND_SEMESTER": "00000000-0000-0000-0000-000000000402"
    }
    
    for template in student_templates:
        yl = template["yl"]
        student_id = template["id"]
        if yl == 1:
            continue
            
        for cc in all_cc:
            pc_yl = cc["year_level"]
            if pc_yl >= yl:
                continue
                
            pc_sem = cc["semester"]
            pc_course_id = cc["course_id"]
            pc_code = cc["course_code"]
            pc_title = cc["course_title"]
            pc_units = cc["credit_units"]
            
            sy_name = school_year_mapping[yl][pc_yl]
            sy_id = sy_ids[sy_name]
            sem_id = sem_ids[pc_sem]
            prior_sec_id = sec_ids[pc_yl]
            
            # Ensure class schedule
            sched_key = (pc_course_id, sy_id, sem_id, prior_sec_id)
            if sched_key in existing_scheds:
                sched_id = existing_scheds[sched_key]
            else:
                sched_id = str(uuid.uuid4())
                sql_batch.append(f"""
                    INSERT INTO class_schedules (id, section_id, course_id, faculty_id, room_id, school_year_id, semester_id, capacity, status, created_at, updated_at)
                    VALUES ('{sched_id}', '{prior_sec_id}', '{pc_course_id}', 'cb88cbd7-81b1-468a-b384-978cc2e3d7ca', 'a3953283-fc91-4710-937a-4cb033ce2f55', '{sy_id}', '{sem_id}', 40, 'ACTIVE', now(), now());
                """)
                existing_scheds[sched_key] = sched_id
                
            # Ensure enrollment
            enroll_key = (student_id, sy_id, sem_id)
            if enroll_key in existing_enrolls:
                enroll_id = existing_enrolls[enroll_key]
            else:
                enroll_id = str(uuid.uuid4())
                sql_batch.append(f"""
                    INSERT INTO enrollments (id, student_id, program_id, school_year_id, semester_id, status, year_level, section_id, created_at, updated_at)
                    VALUES ('{enroll_id}', '{student_id}', 'c4f4ab47-33fe-4be6-bb07-8ccc58752499', '{sy_id}', '{sem_id}', 'CONFIRMED', {pc_yl}, '{prior_sec_id}', now(), now());
                """)
                existing_enrolls[enroll_key] = enroll_id
                
            # Ensure enrollment subject
            sub_key = (enroll_id, sched_id)
            if sub_key in existing_subjs:
                sub_id = existing_subjs[sub_key]
            else:
                sub_id = str(uuid.uuid4())
                sql_batch.append(f"""
                    INSERT INTO enrollment_subjects (id, enrollment_id, class_schedule_id, status, created_at, updated_at)
                    VALUES ('{sub_id}', '{enroll_id}', '{sched_id}', 'ENROLLED', now(), now());
                """)
                existing_subjs[sub_key] = sub_id
                
            # Ensure grade
            if sub_id in existing_grades:
                grade_id = existing_grades[sub_id]
            else:
                grade_id = str(uuid.uuid4())
                sql_batch.append(f"""
                    INSERT INTO grades (id, enrollment_subject_id, student_id, course_id, section_id, faculty_id, school_year_id, semester_id, final_grade, remarks, status, created_at, updated_at)
                    VALUES ('{grade_id}', '{sub_id}', '{student_id}', '{pc_course_id}', '{prior_sec_id}', 'cb88cbd7-81b1-468a-b384-978cc2e3d7ca', '{sy_id}', '{sem_id}', 1.50, 'PASSED', 'LOCKED', now(), now());
                """)
                existing_grades[sub_id] = grade_id
                
            # Ensure academic record
            if grade_id not in existing_ar:
                ar_id = str(uuid.uuid4())
                # Double single quotes to escape course title if containing single quote
                esc_title = pc_title.replace("'", "''")
                sql_batch.append(f"""
                    INSERT INTO academic_records (id, grade_id, student_id, program_id, curriculum_id, course_id, section_id, faculty_id, school_year_id, semester_id, course_code, course_title, credit_units, final_grade, remarks, grade_status, earned_units, locked_at, created_at, updated_at)
                    VALUES ('{ar_id}', '{grade_id}', '{student_id}', 'c4f4ab47-33fe-4be6-bb07-8ccc58752499', '5e5c3e07-d486-4f3d-976e-7e806739c29f', '{pc_course_id}', '{prior_sec_id}', 'cb88cbd7-81b1-468a-b384-978cc2e3d7ca', '{sy_id}', '{sem_id}', '{pc_code}', '{esc_title}', {pc_units}, 1.50, 'PASSED', 'LOCKED', {pc_units}, now(), now(), now());
                """)
                existing_ar[grade_id] = ar_id

    if sql_batch:
        print(f"Executing SQL batch of {len(sql_batch)} inserts...")
        sql_batch_str = "BEGIN;\n" + "\n".join(sql_batch) + "\nCOMMIT;"
        # Write to temporary SQL file in host directory to execute via psql -f
        with open("batch_seed.sql", "w") as f:
            f.write(sql_batch_str)
        
        # Execute batch script
        cmd = ["docker", "compose", "exec", "-T", "postgres", "psql", "-U", "sis_user", "-d", "sis_db", "-f", "/batch_seed.sql"]
        # Wait, the file is on the host. But postgres container volume maps project root?
        # Let's check: does postgres service map the current directory?
        # In docker-compose.yml, volume mappings are:
        # postgres maps `postgres_data:/var/lib/postgresql/data`
        # But wait! We can pass the batch script via stdin to psql instead!
        # E.g. docker compose exec -T postgres psql -U ... < batch_seed.sql
        # This is extremely simple and does not require file sharing inside the container!
        print("Feeding SQL batch via stdin to docker exec psql...")
        # Since we use subprocess, we can do it using input or redirecting stdin.
        cmd = ["docker", "compose", "exec", "-T", "postgres", "psql", "-U", "sis_user", "-d", "sis_db"]
        result = subprocess.run(cmd, input=sql_batch_str, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Batch SQL failed: {result.stderr}")
        print("Batch SQL seeding completed successfully.")
    else:
        print("No new prior grades to seed.")

    # 7. Complete the enrollment lifecycle for the active term via REST APIs
    print("Enrolling students for active term...")
    for idx, template in enumerate(student_templates):
        yl = template["yl"]
        student_id = template["id"]
        student_num = template["student_num"]
        
        print(f"\n[{idx+1}/19] Enrolling student: {student_num} (Year {yl})")
        
        # Check if enrollment already exists for current semester
        enroll_check = query_json(f"""
            SELECT id, status FROM enrollments 
            WHERE student_id = '{student_id}' 
              AND school_year_id = '{active_sy_id}' 
              AND semester_id = '{active_sem_id}';
        """)
        
        enroll_id = None
        if enroll_check:
            enroll_id = enroll_check[0]["id"]
            enroll_status = enroll_check[0]["status"]
            print(f"Enrollment already exists: {enroll_id} (status: {enroll_status})")
        else:
            # Create draft enrollment via REST API
            enroll_payload = {
                "studentId": student_id,
                "schoolYearId": active_sy_id,
                "semesterId": active_sem_id,
                "yearLevel": yl,
                "sectionId": sec_ids[yl],
                "remarks": "Migration test"
            }
            r = requests.post(f"{BASE_URL}/enrollments", json=enroll_payload, headers=headers)
            if r.status_code != 200:
                print(f"Create enrollment failed: {r.text}")
            r.raise_for_status()
            enroll_resp = r.json()["data"]
            enroll_id = enroll_resp["id"]
            enroll_status = enroll_resp["status"]
            print(f"Enrollment draft created: {enroll_id}")

        # Ensure all schedules for the current year level's section are assigned to enrollment
        if enroll_status == "DRAFT":
            print("Ensuring all schedules are assigned...")
            # Query enrollment details
            r = requests.get(f"{BASE_URL}/enrollments/{enroll_id}", headers=headers)
            r.raise_for_status()
            curr_subjects = r.json()["data"]["subjects"]
            curr_sched_ids = {s["scheduleId"] for s in curr_subjects}
            
            # Fetch active schedules of the section
            sec_scheds = query_json(f"""
                SELECT id, course_id FROM class_schedules 
                WHERE section_id = '{sec_ids[yl]}' 
                  AND school_year_id = '{active_sy_id}' 
                  AND semester_id = '{active_sem_id}' 
                  AND status = 'ACTIVE';
            """)
            
            # Add missing schedules
            for s in sec_scheds:
                sch_id = s["id"]
                if sch_id not in curr_sched_ids:
                    print(f"Adding schedule {sch_id} to enrollment...")
                    sub_payload = {"scheduleId": sch_id}
                    r = requests.post(f"{BASE_URL}/enrollments/{enroll_id}/subjects", json=sub_payload, headers=headers)
                    if r.status_code != 200:
                        print(f"Add subject {sch_id} failed: {r.text}")
                    r.raise_for_status()
            
            # Confirm enrollment via REST API
            print("Confirming enrollment...")
            r = requests.post(f"{BASE_URL}/enrollments/{enroll_id}/confirm", headers=headers)
            if r.status_code != 200:
                print(f"Confirm failed: {r.text}")
            r.raise_for_status()
            print("Enrollment confirmed.")
            
        # Check if assessment is already generated
        assess_check = query_json(f"""
            SELECT id FROM assessments WHERE enrollment_id = '{enroll_id}';
        """)
        if assess_check:
            print(f"Assessment already exists: {assess_check[0]['id']}")
        else:
            # Generate assessment
            print("Generating fee assessment...")
            r = requests.post(f"{BASE_URL}/enrollments/{enroll_id}/generate-assessment", headers=headers)
            if r.status_code != 200:
                print(f"Generate assessment failed: {r.text}")
            r.raise_for_status()
            assess_id = r.json()["data"]["id"]
            print(f"Fee assessment generated: {assess_id}")

    print("\nEnrollment migration completed successfully!")

if __name__ == "__main__":
    main()
