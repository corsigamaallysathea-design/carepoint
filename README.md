# CarePoint — Clinic Appointment and Patient Record System

## Project Description

CarePoint is a web-based Clinic Appointment and Patient Record System developed using Python Flask and Firebase Cloud Firestore for the Advanced Database Final Practical Activity.

The system provides a centralized platform for managing patient information, doctor records, and clinic appointments. It features a modern Teal and Mint dashboard designed to provide an interactive, responsive, and user-friendly experience.

## Live Website

**Vercel Deployment:**

[https://carepoint-iota.vercel.app/](https://carepoint-iota.vercel.app/)

## Project Objectives

- Provide centralized management of patient and doctor records.
- Simplify clinic appointment scheduling and monitoring.
- Implement Create, Read, Update, and Delete (CRUD) operations.
- Maintain accurate records through data validation.
- Provide an interactive and responsive healthcare dashboard.
- Demonstrate cloud database integration and web application deployment.

## Technologies Used

- Python Flask
- HTML5
- CSS3
- JavaScript
- Firebase Cloud Firestore
- Firebase Admin SDK
- Python-dotenv
- PyCharm
- GitHub
- Vercel

## System Features

### Dashboard

- Total registered patients
- Total registered doctors
- Total appointments
- Scheduled appointments
- Recent appointment records
- Firestore connection status
- Interactive statistical cards
- Sample record initialization

### Patient Management

- Register new patients
- View patient information
- Edit existing patient records
- Delete patient records
- Search patient information
- Automatic age calculation based on birth date

### Doctor Management

- Register new doctors
- View doctor information
- Update doctor records
- Delete doctor records
- Search by name, specialty, or email

### Appointment Management

- Schedule clinic appointments
- Select registered patients and doctors
- View appointment details
- Update appointment information
- Delete appointment records
- Search appointments
- Monitor appointment status

### Additional Features

- Complete CRUD operations
- REST API integration
- Client-side and server-side validation
- Delete confirmation dialogs
- Success and error notifications
- Responsive dashboard interface
- Automatic Firestore collection creation
- Sample data insertion with duplicate prevention
- Individual record retrieval
- Referenced patient and doctor documents

## User Interface Design

CarePoint features a modern Teal and Mint healthcare-inspired interface.

| Color | Hex Code |
|---|---|
| Deep Teal | #134E4A |
| Primary Teal | #0F766E |
| Mint Green | #5EEAD4 |
| Soft Mint | #CCFBF1 |
| White Mist | #F8FAFC |

The interface includes organized navigation, interactive components, responsive tables, and a professional healthcare dashboard.

## Firebase Cloud Firestore Database

CarePoint uses three main Firestore collections.

### 1. Patients Collection

Collection name: `patients`

| Field | Data Type | Description |
|---|---|---|
| full_name | String | Patient's complete name |
| birth_date | String | Patient's date of birth |
| gender | String | Patient's gender |
| phone | String | Contact number |
| email | String | Email address |
| created_at | String | Record creation timestamp |
| updated_at | String | Last modification timestamp |

Patient age is automatically calculated based on the birth date.

### 2. Doctors Collection

Collection name: `doctors`

| Field | Data Type | Description |
|---|---|---|
| full_name | String | Doctor's complete name |
| specialty | String | Medical specialization |
| phone | String | Contact number |
| email | String | Email address |
| created_at | String | Record creation timestamp |
| updated_at | String | Last modification timestamp |

### 3. Appointments Collection

Collection name: `appointments`

| Field | Data Type | Description |
|---|---|---|
| patient_id | String | Referenced patient document ID |
| patient_name | String | Patient's name |
| doctor_id | String | Referenced doctor document ID |
| doctor_name | String | Doctor's name |
| appointment_date | String | Scheduled appointment date |
| appointment_time | String | Scheduled appointment time |
| reason | String | Reason for consultation |
| status | String | Appointment status |
| created_at | String | Record creation timestamp |
| updated_at | String | Last modification timestamp |

### Appointment Status

- Scheduled
- Completed
- Cancelled

## Project Structure

    CarePoint/
    ├── static/
    │   ├── css/
    │   │   └── style.css
    │   └── js/
    │       ├── app.js
    │       └── script.js
    ├── templates/
    │   └── index.html
    ├── app.py
    ├── firebase_config.py
    ├── init_firestore.py
    ├── check_env.py
    ├── requirements.txt
    ├── vercel.json
    ├── .env.example
    ├── .gitignore
    └── README.md

## Local Installation and Setup

### Step 1: Open the Project

Open the CarePoint project folder using PyCharm.

### Step 2: Create a Virtual Environment

    python -m venv .venv

### Step 3: Activate the Virtual Environment

For Windows PowerShell:

    .\.venv\Scripts\Activate.ps1

### Step 4: Install Dependencies

    python -m pip install -r requirements.txt

### Step 5: Configure Firebase

1. Visit https://console.firebase.google.com/.
2. Create or select a Firebase project.
3. Enable Cloud Firestore.
4. Navigate to Project Settings.
5. Select Service Accounts.
6. Generate a new private key.
7. Download the Firebase service account JSON file.
8. Place the JSON file inside the local project folder.

### Step 6: Configure Environment Variables

Create a local `.env` file containing:

    GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account.json
    FLASK_DEBUG=false

Ensure that the credential filename matches the actual downloaded service account JSON file.

### Step 7: Initialize Firestore

Run the Firestore initialization script:

    python init_firestore.py

This script performs the following operations:

- Initializes the Firebase connection.
- Displays the Firebase project ID.
- Tests the Firestore database connection.
- Calls the database record initialization function.
- Displays the initialization status and elapsed time.
- Reports connection errors when initialization fails.

### Step 8: Run the Application

    python app.py

Open the local website:

[http://127.0.0.1:5000/](http://127.0.0.1:5000/)

## REST API Documentation

### General Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Check Firestore connection |
| GET | /api/dashboard | Retrieve dashboard statistics |

### Patient Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/patients | Retrieve patient records |
| GET | /api/patients/:id | Retrieve individual patient |
| POST | /api/patients | Create patient record |
| PUT | /api/patients/:id | Update patient record |
| DELETE | /api/patients/:id | Delete patient record |

### Doctor Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/doctors | Retrieve doctor records |
| GET | /api/doctors/:id | Retrieve individual doctor |
| POST | /api/doctors | Create doctor record |
| PUT | /api/doctors/:id | Update doctor record |
| DELETE | /api/doctors/:id | Delete doctor record |

### Appointment Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/appointments | Retrieve appointment records |
| GET | /api/appointments/:id | Retrieve individual appointment |
| POST | /api/appointments | Create appointment record |
| PUT | /api/appointments/:id | Update appointment record |
| DELETE | /api/appointments/:id | Delete appointment record |

Patient and doctor records cannot be deleted while existing appointments reference their document IDs.

## Vercel Deployment

CarePoint uses Vercel for web application hosting and Firebase Cloud Firestore for persistent cloud database storage.

### Deployment Procedure

1. Create a GitHub repository.
2. Upload the required project source files.
3. Import the GitHub repository into Vercel.
4. Configure the environment variables.
5. Deploy the application.
6. Verify the Firestore connection.
7. Test the system's CRUD operations.

### Vercel Environment Variables

| Variable | Value |
|---|---|
| FIREBASE_SERVICE_ACCOUNT | Complete Firebase service account JSON |
| FLASK_DEBUG | false |

Firebase credentials are securely configured through Vercel environment variables instead of being uploaded to GitHub.

### Live Application URL

https://carepoint-iota.vercel.app/

### Firestore Health Check

https://carepoint-iota.vercel.app/api/health

## System Architecture

    User Browser
         |
    HTML, CSS, JavaScript
         |
    Vercel Cloud Hosting
         |
    Python Flask REST API
         |
    Firebase Admin SDK
         |
    Firebase Cloud Firestore

## Data Validation and Security

- Required field validation
- Email format validation
- Appointment date and time validation
- Patient and doctor reference validation
- Duplicate prevention for sample records
- Confirmation before deleting records
- Protected Firebase service account credentials
- Private environment variable configuration
- Error handling and user notifications

## GitHub Submission Checklist

- [ ] Private GitHub repository
- [ ] Complete project source files
- [ ] Finalized README.md
- [ ] app.py
- [ ] firebase_config.py
- [ ] init_firestore.py
- [ ] HTML, CSS, and JavaScript files
- [ ] requirements.txt
- [ ] vercel.json
- [ ] .gitignore
- [ ] Firebase Cloud Firestore configuration
- [ ] Verified CRUD operations
- [ ] Verified Vercel deployment
- [ ] GitHub collaborator added: kidlat14
- [ ] Repository link submitted before the deadline

## Security and Privacy Notice

The following files must not be uploaded to GitHub:

- .env
- Firebase service account JSON
- .venv
- .idea
- __pycache__

CarePoint is an academic database management prototype intended for educational purposes. Only fictional patient information should be used during demonstrations.

The current prototype does not include user authentication. Authentication, role-based authorization, audit logging, and additional privacy protections must be implemented before using the system for actual healthcare operations.

## Project Information

**Project Name:** CarePoint

**System Title:** Clinic Appointment and Patient Record System

**Project Type:** Web-Based CRUD Application

**Frontend:** HTML5, CSS3, and JavaScript

**Backend:** Python Flask

**Database:** Firebase Cloud Firestore

**Database Initialization:** init_firestore.py

**Development Environment:** PyCharm

**Version Control:** GitHub

**Deployment Platform:** Vercel

**Purpose:** Advanced Database Final Practical Activity

**Website:** https://carepoint-iota.vercel.app/

---

**CarePoint — Simplifying Clinic Management Through Technology.**
