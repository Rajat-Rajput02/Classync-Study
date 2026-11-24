# Classync-Study
This is a Classync Study Project where Professors assign assignments to the students and students completes and uploads them on the same portal.


# Classync Study – Student, Group & Assignment Management System

A role-based full-stack web application built for **Joineazy (Task 1)** that enables students to form groups, manage members, and verify assignment submissions, while professors (admins) create assignments, allocate work, and monitor group and student progress.

---

## 1. Overview of Implementation

Classync Study separates workflows by user role using JWT authentication and PostgreSQL transactional queries:

* **Student Workflow:**
  * Register and log in with role-based JWT tokens.
  * Create a group (automatically adding the creator as a member) and add teammates via **student email** or **student ID** (enforcing one group per student).
  * View assignments allocated to all students or specifically to their group, along with external **OneDrive submission links**.
  * Confirm assignment completion using a **two-step verification flow** (`"Yes, I have submitted"` → final confirmation) backed by an idempotent upsert endpoint.
  * Track group completion visually via progress bars and completion percentages.
* **Professor (Admin) Workflow:**
  * Create, view, and update assignments (`title`, `description`, `dueDate`, `oneDriveLink`).
  * Allocate assignments either globally (`assignedToAll: true`) or to specific groups (`groupIds`).
  * Monitor real-time **group-wise** and **student-wise** submission confirmations.
  * View overall completion metrics and group performance analytics.

---

## 2. Tech Stack

* **Frontend:** React.js, Tailwind CSS, HTML5
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (`pg` connection pooling & SQL transactions)
* **Authentication:** JSON Web Tokens (JWT) with `authenticateToken` and `authorizeRoles` middleware
* **Containerization:** Docker & Docker Compose

---

## 3. Setup & Run Instructions

### Prerequisites
* [Node.js](https://nodejs.org) (v18+)
* [PostgreSQL](https://postgresql.org) (v14+) or [Docker Desktop](https://docker.com)

### Option A: Run with Docker Compose (Recommended)
1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd Classync-Study
   ```
2. **Configure environment variables:**
   Create `backend/.env` with your database and JWT credentials:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:password@db:5432/classync
   JWT_SECRET=your_secret_jwt_key
   ```
3. **Build and start containers:**
   ```bash
   docker-compose up --build
   ```

### Option B: Run Locally (Manual Setup)
1. **Start the Backend:**
   ```bash
   cd backend
   npm install
   # Ensure PostgreSQL is running and backend/.env is configured
   npm run dev
   ```
2. **Start the Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 4. API Endpoint Details

> **Authentication Header:** All protected endpoints require `Authorization: Bearer <jwt_token>`.

### Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new `student` or `admin` account |
| `POST` | `/api/auth/login` | Public | Authenticate credentials and return JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current authenticated user profile |

### Groups (`/api/groups` — Student Role)

| Method | Endpoint | Body / Params | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/groups` | `{ groupName }` | Create a new group and add creator as member |
| `GET` | `/api/groups/my` | — | Fetch groups the logged-in student belongs to |
| `GET` | `/api/groups/:groupId` | `groupId` | Fetch group metadata and list of members |
| `POST` | `/api/groups/:groupId/members` | `{ email }` or `{ studentId }` | Add a student to the group (creator only) |

### Student Assignments & Progress (`/api/student` — Student Role)

| Method | Endpoint | Body / Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/student/assignments` | — | Fetch all assignments available to the student's group |
| `POST` | `/api/student/assignments/:assignmentId/confirm` | `{ groupId }` | Confirm assignment submission (`is_confirmed = TRUE`) |
| `GET` | `/api/student/groups/:groupId/progress` | `groupId` | Calculate member confirmation counts and `%` progress per assignment |

### Admin Management & Analytics (`/api/admin` — Admin Role)

| Method | Endpoint | Body / Params | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/assignments` | `{ title, description, dueDate, oneDriveLink, assignedToAll, groupIds }` | Create an assignment for all students or specific groups |
| `GET` | `/api/admin/assignments` | — | List all assignments created by the logged-in admin |
| `PUT` | `/api/admin/assignments/:assignmentId` | `{ title, description, dueDate, oneDriveLink, assignedToAll, groupIds }` | Update assignment details and replace group allocations |
| `GET` | `/api/admin/assignments/:assignmentId/groups` | `assignmentId` | Track confirmed/pending member counts and `%` per group |
| `GET` | `/api/admin/assignments/:assignmentId/students` | `assignmentId` | Track individual student confirmation status & timestamps |
| `GET` | `/api/admin/analytics` | — | Fetch overall students, assignments, groups, and completion `%` |
| `GET` | `/api/admin/groups` | — | List all existing student groups for assignment allocation |

---

## 5. Database Schema & Relationships

### Entity-Relationship (ER) Diagram

```text
+------------------+       +--------------------+       +------------------+

|      users       |       |   group_members    |       |      groups      |
+------------------+       +--------------------+       +------------------+

| PK id            |<------| FK student_id      |   +-->| PK id            |
|    name          |       | FK group_id        |---+   |    group_name    |
|    email (UNIQUE)|       |    joined_at       |       | FK created_by    |
|    password_hash |       +--------------------+       |    created_at    |
|    role          |                                    +------------------+
+------------------+                                             |

         |                                                       |
         | (created_by)                                          |
         v                                                       v
+------------------+       +--------------------+       +------------------+

|   assignments    |<------| assignment_groups  |       |   submissions    |
+------------------+       +--------------------+       +------------------+

| PK id            |       | FK assignment_id   |   +-->| PK id            |
|    title         |       | FK group_id        |   |   | FK assignment_id |
|    description   |       +--------------------+   |   | FK group_id      |
|    due_date      |                                |   | FK student_id    |
|    onedrive_link |--------------------------------+   |    is_confirmed  |
|    assigned_to_all|                                   |    confirmed_at  |
| FK created_by    |                                    +------------------+
|    created_at    |
|    updated_at    |
+------------------+
```

### Table Definitions & Constraints
* **`users`**: Stores user profiles (`id`, `name`, `email`, `password_hash`, `role` in `['student', 'admin']`).
* **`groups`**: Stores student teams (`id`, `group_name`, `created_by` → `users.id`, `created_at`).
* **`group_members`**: Maps students to groups (`group_id` → `groups.id`, `student_id` → `users.id` with unique constraint preventing multi-group membership, `joined_at`).
* **`assignments`**: Stores coursework (`id`, `title`, `description`, `due_date`, `onedrive_link`, `assigned_to_all`, `created_by` → `users.id`, `created_at`, `updated_at`).
* **`assignment_groups`**: Junction table for targeted group allocations (`assignment_id` → `assignments.id`, `group_id` → `groups.id`).
* **`submissions`**: Tracks individual member confirmations within a group (`assignment_id`, `group_id`, `student_id`, `is_confirmed`, `confirmed_at`) with a unique composite key on `(assignment_id, student_id)`.

---

## 6. Architecture Overview

```text
+-----------------------+       REST API (JSON + Bearer JWT)       +-----------------------+

|   React + Tailwind    | ---------------------------------------> |  Node.js + Express    |
|       Frontend        | <--------------------------------------- |      REST Server      |
+-----------------------+                                          +-----------------------+
                                                                               |
                                                                               | pg Pool / Transactions
                                                                               v
                                                                   +-----------------------+

                                                                   |      PostgreSQL       |
                                                                   |       Database        |
                                                                   +-----------------------+
```

1. **Presentation Layer (React + Tailwind CSS):** Provides separate role-based views for Students and Professors, manages JWT persistence, renders visual progress bars, and enforces the two-step confirmation dialog before invoking submission APIs.
