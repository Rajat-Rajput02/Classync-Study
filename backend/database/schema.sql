
-- 1. USERS
-- Stores both Students and Admins

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 2. GROUPS
-- Students create their own groups

CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 3. GROUP MEMBERS
-- Connects students to groups

CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL
        REFERENCES groups(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (group_id, student_id),
    UNIQUE (student_id)
);


-- 4. ASSIGNMENTS
-- Created by Professors

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMP NOT NULL,
    onedrive_link TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    assigned_to_all BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 5. ASSIGNMENT GROUPS
-- Assignments can be allocated to specific groups

CREATE TABLE IF NOT EXISTS assignment_groups (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL
        REFERENCES assignments(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL
        REFERENCES groups(id) ON DELETE CASCADE,

    UNIQUE (assignment_id, group_id)
);


-- 6. SUBMISSIONS
-- Stores individual student confirmations

CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL
        REFERENCES assignments(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL
        REFERENCES groups(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    is_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP,

    UNIQUE (assignment_id, student_id)
);


-- INDEXES
-- Improve commonly used database lookups

CREATE INDEX IF NOT EXISTS idx_group_members_group
ON group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_assignments_created_by
ON assignments(created_by);

CREATE INDEX IF NOT EXISTS idx_assignment_groups_assignment
ON assignment_groups(assignment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_groups_group
ON assignment_groups(group_id);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment
ON submissions(assignment_id);

CREATE INDEX IF NOT EXISTS idx_submissions_group
ON submissions(group_id);
