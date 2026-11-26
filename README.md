# CarePoint — Clinic Appointment and Patient Record System

A Flask and Firebase Cloud Firestore CRUD web application developed for the **Advanced Database Final Practical Activity**.

CarePoint provides a centralized platform for managing patient records, doctor information, and clinic appointments through a responsive web-based dashboard.

## 1. Technology Stack

- Python 3.10 or newer
- Flask
- HTML5
- CSS3
- JavaScript
- Firebase Cloud Firestore
- Firebase Admin SDK
- python-dotenv

## 2. Features

### Dashboard
- Displays the total number of registered patients.
- Displays the total number of registered doctors.
- Shows the total number of appointments.
- Displays the number of scheduled appointments.
- Shows recent appointment records.
- Indicates the Firestore connection status.

### Patient Management
- Add new patient records.
- View registered patients.
- Edit existing patient information.
- Delete patient records.
- Search patients by name, email, phone number, or ID.

### Doctor Management
- Add new doctor records.
- View registered doctors.
- Edit doctor information.
- Delete doctor records.
- Search doctors by name, specialty, or email.

### Appointment Management
- Create appointments using existing patient and doctor records.
- View appointment details.
- Edit existing appointments.
- Delete appointment records.
- Update appointment status.
- Search appointments by patient, doctor, date, or status.

### Additional Features
- Browser-side and server-side form validation.
- REST API integration.
- Individual record retrieval.
- Appointment references to existing patient and doctor documents.
- Confirmation before deleting records.
- Success and error notifications.
- Responsive and professional dashboard interface.

## 3. Firestore Database Structure

CarePoint uses three Firestore collections. These collections are created automatically when the first document is saved.

### 3.1 Patients Collection

Collection name: `patients`

| Field | Data Type | Description |
|---|---|---|
| full_name | String | Patient's complete name |
| birth_date | String | Birth date (YYYY-MM-DD) |
| gender | String | Patient's gender |
| phone | String | Contact number |
| email | String | Email address |
| address | String | Address (optional) |
| created_at | String | Record creation timestamp |
| updated_at | String | Last update timestamp |

### 3.2 Doctors Collection

Collection name: `doctors`

| Field | Data Type | Description |
|---|---|---|
| full_name | String | Doctor's complete name |
| specialty | String | Medical specialty |
| phone | String | Contact number |
| email | String | Email address |
| created_at | String | Record creation timestamp |
| updated_at | String | Last update timestamp |

### 3.3 Appointments Collection

Collection name: `appointments`

| Field | Data Type | Description |
|---|---|---|
| patient_id | String | Referenced patient document ID |
| patient_name | String | Patient's display name |
| doctor_id | String | Referenced doctor document ID |
| doctor_name | String | Doctor's display name |
| appointment_date | String | Appointment date (YYYY-MM-DD) |
| appointment_time | String | Appointment time (HH:MM) |
| reason | String | Reason for consultation |
| status | String | Scheduled, Completed, or Cancelled |
| created_at | String | Record creation timestamp |
| updated_at | String | Last update timestamp |

**Note:** The `patient_id` and `doctor_id` fields store the corresponding Firestore document IDs. Patient and doctor names are also stored in appointment records for display purposes.

## 4. Project Setup in PyCharm

### Step 1. Open the Project

1. Open PyCharm.
2. Select **Open**.
3. Locate and select the CarePoint project folder.
4. Wait for PyCharm to finish loading the project.

### Step 2. Create a Virtual Environment

Open the PyCharm Terminal and execute:

```bash
python -m venv .venv
```

### Step 3. Activate the Virtual Environment

For Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, use Command Prompt:

```bat
.venv\Scripts\activate.bat
```

### Step 4. Install Dependencies

Run:

```bash
pip install -r requirements.txt
```

If you do not have a `requirements.txt` file yet, install the required packages:

```bash
pip install Flask firebase-admin python-dotenv
```

To generate a requirements file:

```bash
pip freeze > requirements.txt
```

## 5. Firebase Configuration

### Step 1. Create a Firebase Project

1. Visit the [Firebase Console](https://console.firebase.google.com/).
2. Create a new Firebase project.
3. Use the project name **ClinicAppointment** or your preferred project name.

### Step 2. Enable Cloud Firestore

1. Open your Firebase project.
2. Navigate to **Build → Firestore Database**.
3. Select **Create Database**.
4. Complete the database setup.

### Step 3. Generate a Service Account Key

1. Open **Project Settings**.
2. Select the **Service Accounts** tab.
3. Choose **Generate New Private Key**.
4. Download the JSON file.
5. Place it in the root directory of your CarePoint project.
6. Rename it to:

```text
firebase-service-account.json
```

### Step 4. Configure the Environment Variables

Create a `.env` file in the project root directory.

Add the following configuration:

```env
GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account.json
FLASK_DEBUG=false
```

If your service account file has a different filename, make sure the path in `.env` matches its actual name.

For example, if the file is named `Service Account key.json`:

```env
GOOGLE_APPLICATION_CREDENTIALS=Service Account key.json
FLASK_DEBUG=false
```

You may also specify an absolute path:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:/Users/YourName/keys/firebase-service-account.json
FLASK_DEBUG=false
```

**Security Reminder:** Never upload your `.env` file or Firebase service account JSON file to GitHub. These files contain sensitive credentials.

## 6. Running the Application

Open the PyCharm Terminal.

Make sure your virtual environment is activated, then execute:

```bash
python app.py
```

Open your browser and navigate to:

[http://127.0.0.1:5000](http://127.0.0.1:5000)

Once Firebase is configured successfully, the sidebar connection indicator should display:

**Connected**

## 7. REST API Documentation

CarePoint uses Flask REST API endpoints to communicate with Firebase Cloud Firestore.

### General Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check Firestore connection |
| GET | `/api/dashboard` | Retrieve dashboard statistics |

### Patient Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/patients?q=term` | List and search patients |
| GET | `/api/patients/<id>` | Retrieve one patient |
| POST | `/api/patients` | Create a patient |
| PUT | `/api/patients/<id>` | Update a patient |
| DELETE | `/api/patients/<id>` | Delete a patient |

### Doctor Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/doctors?q=term` | List and search doctors |
| GET | `/api/doctors/<id>` | Retrieve one doctor |
| POST | `/api/doctors` | Create a doctor |
| PUT | `/api/doctors/<id>` | Update a doctor |
| DELETE | `/api/doctors/<id>` | Delete a doctor |

### Appointment Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/appointments?q=term` | List and search appointments |
| GET | `/api/appointments/<id>` | Retrieve one appointment |
| POST | `/api/appointments` | Create an appointment |
| PUT | `/api/appointments/<id>` | Update an appointment |
| DELETE | `/api/appointments/<id>` | Delete an appointment |

### API Response Format

Successful API responses follow this general JSON structure:

```json
{
    "success": true,
    "message": "Record saved successfully.",
    "data": {}
}
```

Failed requests return an appropriate HTTP error status and a JSON error message.

**Record deletion restriction:** A patient or doctor cannot be deleted while appointment records still reference their document IDs.

## 8. Suggested Demonstration Sequence

The following sequence is recommended when presenting the application during the final practical activity.

1. Launch CarePoint and demonstrate the dashboard.
2. Show the Firestore connection indicator.
3. Add a new doctor.
4. Register a new patient.
5. Create an appointment by selecting the registered patient and doctor.
6. Search for the registered patient or appointment.
7. Edit the patient information.
8. Edit the appointment details.
9. Change the appointment status to Completed.
10. Demonstrate the delete confirmation.
11. Delete the appointment.
12. Delete the patient or doctor after the appointment has been removed.
13. Open Firebase Console and demonstrate the stored collections and documents.
14. Return to the dashboard and show the updated statistics.

## 9. Academic and Privacy Notes

- Use fictional patient information during classroom demonstrations.
- Do not enter actual patient medical information into the academic prototype.
- CarePoint is an academic CRUD application and is not a production electronic medical record system.
- Before real-world deployment, implement authentication, role-based access control, audit logs, HTTPS, database access protections, backups, and appropriate privacy and legal review.
- Protect Firebase service account credentials and other sensitive configuration files.
- Empty Firestore collections may not appear in Firebase Console until the first document is written.

## 10. GitHub Submission Checklist

Before submitting the project, verify the following:

- [ ] Create a private GitHub repository.
- [ ] Upload all required project source files.
- [ ] Include the finalized README.md.
- [ ] Include `requirements.txt`.
- [ ] Include the `.gitignore` file.
- [ ] Do not upload `.env`.
- [ ] Do not upload the Firebase service account JSON file.
- [ ] Add the GitHub collaborator `kidlat14`.
- [ ] Verify that the project runs from a fresh environment.
- [ ] Test patient, doctor, and appointment CRUD operations.
- [ ] Confirm the Firestore connection.
- [ ] Submit the repository link before the instructor's deadline.

---

**Project:** CarePoint — Clinic Appointment and Patient Record System

**Technology:** Flask, Python, and Firebase Cloud Firestore

**Project Type:** Web-Based CRUD Application

**Purpose:** Advanced Database Final Practical Activity
## Finalized interface update

Run `app.py` (the version with automatic age calculation). Copy `.env.example` to `.env` and point it to your own newly generated service account key. The key is not included. The dashboard's Load sample records button inserts three fictional records per collection, using fixed demo IDs to avoid duplicates and preserving existing records. Fill example in a form only fills fields; Save record writes to Firestore. The patient schema includes calculated age; address is not implemented. Use locally with fictional data only; this prototype has no login.

## Teal & Mint edition

The interface uses deep teal (#134E4A), teal (#0F766E), mint (#5EEAD4), soft mint (#CCFBF1), and white mist (#F8FAFC). CRUD and sample data behavior are unchanged.
