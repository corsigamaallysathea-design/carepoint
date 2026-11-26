import os
import re

from datetime import date, datetime, timezone, timedelta

from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
from firebase_config import get_db


# ======================================================
# 1. FLASK CONFIGURATION
# ======================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(
    os.path.join(BASE_DIR, ".env"),
    override=True
)

app = Flask(__name__)

FIRESTORE_TIMEOUT = 15

COLLECTIONS = {
    "patients": "patients",
    "doctors": "doctors",
    "appointments": "appointments"
}

ALLOWED_GENDERS = [
    "Female",
    "Male",
    "Prefer not to say"
]

ALLOWED_STATUSES = [
    "Scheduled",
    "Completed",
    "Cancelled"
]

ALLOWED_FIELDS = {

    "patients": {
        "full_name",
        "birth_date",
        "gender",
        "phone",
        "email"
    },

    "doctors": {
        "full_name",
        "specialty",
        "phone",
        "email"
    },

    "appointments": {
        "patient_id",
        "doctor_id",
        "appointment_date",
        "appointment_time",
        "reason",
        "status"
    }

}


# ======================================================
# 2. GENERAL HELPER FUNCTIONS
# ======================================================

def now_utc():

    return datetime.now(timezone.utc).isoformat(
        timespec="seconds"
    )


def clean(value):

    if isinstance(value, str):
        return value.strip()

    return value


def error(message, status=400):

    return jsonify({
        "success": False,
        "message": message
    }), status


def json_safe(value):

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, dict):

        return {
            key: json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):

        return [
            json_safe(item)
            for item in value
        ]

    return value


def calculate_age(birth_date):

    today = date.today()

    age = today.year - birth_date.year

    if (today.month, today.day) < (
        birth_date.month,
        birth_date.day
    ):

        age -= 1

    return age


def serialize(doc):

    data = doc.to_dict() or {}

    data["id"] = doc.id

    if data.get("birth_date"):

        try:

            birth_date = date.fromisoformat(
                data["birth_date"]
            )

            data["age"] = calculate_age(birth_date)

        except (ValueError, TypeError):

            pass

    return json_safe(data)


def get_collection(resource):

    if resource not in COLLECTIONS:

        raise ValueError("Unknown collection.")

    return get_db().collection(
        COLLECTIONS[resource]
    )


def validate_email(value):

    return isinstance(value, str) and bool(

        re.match(
            r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
            value
        )

    )


def get_json_data():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):

        return None

    return {
        key: clean(value)
        for key, value in data.items()
    }


def filter_record_fields(resource, data):

    return {

        key: value

        for key, value in data.items()

        if key in ALLOWED_FIELDS[resource]

    }


def validate_required_fields(data, fields):

    missing = [

        field

        for field in fields

        if not isinstance(data.get(field), str)
        or not data.get(field).strip()

    ]

    if missing:

        return (
            "Please complete all required fields: "
            + ", ".join(missing)
        )

    return None


# ======================================================
# 3. PATIENT VALIDATION
# ======================================================

def validate_patient(data):

    required = [

        "full_name",
        "birth_date",
        "gender",
        "phone",
        "email"

    ]

    message = validate_required_fields(
        data,
        required
    )

    if message:
        return message

    if len(data["full_name"]) > 150:

        return "Patient name is too long."

    if not validate_email(data["email"]):

        return "Please enter a valid email address."

    if data["gender"] not in ALLOWED_GENDERS:

        return "Please select a valid gender."

    if len(data["phone"]) > 30:

        return "Phone number is too long."

    try:

        birth_date = datetime.strptime(
            data["birth_date"],
            "%Y-%m-%d"
        ).date()

        if birth_date > date.today():

            return "Birth date cannot be in the future."

        data["age"] = calculate_age(birth_date)

    except (ValueError, TypeError):

        return "Please enter a valid birth date."

    return None


# ======================================================
# 4. DOCTOR VALIDATION
# ======================================================

def validate_doctor(data):

    required = [

        "full_name",
        "specialty",
        "phone",
        "email"

    ]

    message = validate_required_fields(
        data,
        required
    )

    if message:
        return message

    if len(data["full_name"]) > 150:

        return "Doctor name is too long."

    if len(data["specialty"]) > 150:

        return "Specialization is too long."

    if not validate_email(data["email"]):

        return "Please enter a valid email address."

    if len(data["phone"]) > 30:

        return "Phone number is too long."

    return None


# ======================================================
# 5. APPOINTMENT VALIDATION
# ======================================================

def validate_appointment(data):

    required = [

        "patient_id",
        "doctor_id",
        "appointment_date",
        "appointment_time",
        "reason",
        "status"

    ]

    message = validate_required_fields(
        data,
        required
    )

    if message:
        return message

    if len(data["reason"]) > 2000:

        return "Appointment reason is too long."

    if data["status"] not in ALLOWED_STATUSES:

        return "Please select a valid status."

    if "/" in data["patient_id"]:

        return "Invalid patient ID."

    if "/" in data["doctor_id"]:

        return "Invalid doctor ID."

    try:

        datetime.strptime(
            data["appointment_date"],
            "%Y-%m-%d"
        )

        datetime.strptime(
            data["appointment_time"],
            "%H:%M"
        )

    except (ValueError, TypeError):

        return "Please enter a valid date and time."

    return None


VALIDATORS = {

    "patients": validate_patient,

    "doctors": validate_doctor,

    "appointments": validate_appointment

}


# ======================================================
# 6. APPOINTMENT RELATIONSHIPS
# ======================================================

def add_appointment_names(record):

    db = get_db()

    patient_ref = db.collection(
        "patients"
    ).document(
        record["patient_id"]
    )

    doctor_ref = db.collection(
        "doctors"
    ).document(
        record["doctor_id"]
    )

    # Retrieve both linked documents in one request.

    documents = {

        doc.reference.path: doc

        for doc in db.get_all(

            [patient_ref, doctor_ref],

            timeout=FIRESTORE_TIMEOUT

        )

    }

    patient = documents.get(patient_ref.path)

    doctor = documents.get(doctor_ref.path)

    if patient is None or not patient.exists:

        raise ValueError(
            "The selected patient does not exist."
        )

    if doctor is None or not doctor.exists:

        raise ValueError(
            "The selected doctor does not exist."
        )

    record["patient_name"] = (
        patient.to_dict() or {}
    ).get("full_name", "")

    record["doctor_name"] = (
        doctor.to_dict() or {}
    ).get("full_name", "")

    return record


def sync_appointment_names(
    resource,
    record_id,
    new_name
):

    if resource not in ["patients", "doctors"]:

        return

    db = get_db()

    linked_field = (

        "patient_id"

        if resource == "patients"

        else "doctor_id"

    )

    name_field = (

        "patient_name"

        if resource == "patients"

        else "doctor_name"

    )

    appointments = (

        db.collection("appointments")

        .where(linked_field, "==", record_id)

        .stream(timeout=FIRESTORE_TIMEOUT)

    )

    batch = db.batch()

    count = 0

    for appointment in appointments:

        batch.update(

            appointment.reference,

            {
                name_field: new_name,
                "updated_at": now_utc()
            }

        )

        count += 1

        if count >= 400:

            batch.commit(
                timeout=FIRESTORE_TIMEOUT
            )

            batch = db.batch()

            count = 0

    if count:

        batch.commit(
            timeout=FIRESTORE_TIMEOUT
        )


# ======================================================
# 7. INITIAL DATABASE RECORDS
# ======================================================

def initialize_records():

    db = get_db()

    marker = db.collection(
        "_system"
    ).document(
        "carepoint_initialized"
    )

    # Prevent duplicate initialization.

    if marker.get(
        timeout=FIRESTORE_TIMEOUT
    ).exists:

        print("Database already initialized.")

        return

    # Preserve existing Firestore records.

    for collection in COLLECTIONS.values():

        existing = next(

            db.collection(collection)

            .limit(1)

            .stream(timeout=FIRESTORE_TIMEOUT),

            None

        )

        if existing is not None:

            marker.set({

                "initialized": True,

                "initialized_at": now_utc()

            }, timeout=FIRESTORE_TIMEOUT)

            print("Existing records preserved.")

            return

    timestamp = now_utc()

    current_date = date.today()


    # ==================================================
    # PATIENT RECORDS
    # ==================================================

    patients = [

        {
            "id": "PAT001",
            "full_name": "Maria Santos",
            "birth_date": "2000-05-12",
            "gender": "Female",
            "phone": "00000000001",
            "email": "maria.santos@example.com"
        },

        {
            "id": "PAT002",
            "full_name": "Carlo Reyes",
            "birth_date": "2001-08-20",
            "gender": "Male",
            "phone": "00000000002",
            "email": "carlo.reyes@example.com"
        },

        {
            "id": "PAT003",
            "full_name": "Ana Cruz",
            "birth_date": "2002-03-15",
            "gender": "Female",
            "phone": "00000000003",
            "email": "ana.cruz@example.com"
        },

        {
            "id": "PAT004",
            "full_name": "Daniel Garcia",
            "birth_date": "1998-11-10",
            "gender": "Male",
            "phone": "00000000004",
            "email": "daniel.garcia@example.com"
        },

        {
            "id": "PAT005",
            "full_name": "Sophia Mendoza",
            "birth_date": "2003-07-25",
            "gender": "Female",
            "phone": "00000000005",
            "email": "sophia.mendoza@example.com"
        }

    ]


    # ==================================================
    # DOCTOR RECORDS
    # ==================================================

    doctors = [

        {
            "id": "DOC001",
            "full_name": "Dr. Elena Garcia",
            "specialty": "General Medicine",
            "phone": "00000000006",
            "email": "elena.garcia@example.com"
        },

        {
            "id": "DOC002",
            "full_name": "Dr. Luis Ramos",
            "specialty": "Pediatrics",
            "phone": "00000000007",
            "email": "luis.ramos@example.com"
        },

        {
            "id": "DOC003",
            "full_name": "Dr. Nina Flores",
            "specialty": "Family Medicine",
            "phone": "00000000008",
            "email": "nina.flores@example.com"
        },

        {
            "id": "DOC004",
            "full_name": "Dr. Miguel Torres",
            "specialty": "Internal Medicine",
            "phone": "00000000009",
            "email": "miguel.torres@example.com"
        },

        {
            "id": "DOC005",
            "full_name": "Dr. Angela Rivera",
            "specialty": "Dermatology",
            "phone": "00000000010",
            "email": "angela.rivera@example.com"
        }

    ]


    # ==================================================
    # APPOINTMENT RECORDS
    # ==================================================

    appointments = [

        {
            "id": "APT001",
            "patient_id": "PAT001",
            "doctor_id": "DOC001",
            "patient_name": "Maria Santos",
            "doctor_name": "Dr. Elena Garcia",
            "appointment_date": current_date.isoformat(),
            "appointment_time": "09:00",
            "reason": "General health checkup",
            "status": "Scheduled"
        },

        {
            "id": "APT002",
            "patient_id": "PAT002",
            "doctor_id": "DOC002",
            "patient_name": "Carlo Reyes",
            "doctor_name": "Dr. Luis Ramos",
            "appointment_date": (
                current_date - timedelta(days=1)
            ).isoformat(),
            "appointment_time": "10:30",
            "reason": "Medical consultation",
            "status": "Completed"
        },

        {
            "id": "APT003",
            "patient_id": "PAT003",
            "doctor_id": "DOC003",
            "patient_name": "Ana Cruz",
            "doctor_name": "Dr. Nina Flores",
            "appointment_date": current_date.isoformat(),
            "appointment_time": "13:00",
            "reason": "Follow-up consultation",
            "status": "Cancelled"
        },

        {
            "id": "APT004",
            "patient_id": "PAT004",
            "doctor_id": "DOC004",
            "patient_name": "Daniel Garcia",
            "doctor_name": "Dr. Miguel Torres",
            "appointment_date": (
                current_date + timedelta(days=1)
            ).isoformat(),
            "appointment_time": "14:00",
            "reason": "Routine physical examination",
            "status": "Scheduled"
        },

        {
            "id": "APT005",
            "patient_id": "PAT005",
            "doctor_id": "DOC005",
            "patient_name": "Sophia Mendoza",
            "doctor_name": "Dr. Angela Rivera",
            "appointment_date": (
                current_date + timedelta(days=2)
            ).isoformat(),
            "appointment_time": "11:00",
            "reason": "Skin consultation",
            "status": "Scheduled"
        }

    ]


    # ==================================================
    # BATCH INSERTION
    # ==================================================

    batch = db.batch()

    initial_records = {

        "patients": patients,

        "doctors": doctors,

        "appointments": appointments

    }

    for collection, records in initial_records.items():

        for item in records:

            record = dict(item)

            record_id = record.pop("id")

            record["created_at"] = timestamp

            record["updated_at"] = timestamp

            if collection == "patients":

                record["age"] = calculate_age(

                    date.fromisoformat(
                        record["birth_date"]
                    )

                )

            reference = db.collection(
                collection
            ).document(
                record_id
            )

            batch.create(
                reference,
                record
            )

    batch.create(

        marker,

        {
            "initialized": True,
            "initialized_at": timestamp
        }

    )

    try:

        batch.commit(
            timeout=FIRESTORE_TIMEOUT
        )

    except Exception:

        if not marker.get(
            timeout=FIRESTORE_TIMEOUT
        ).exists:

            raise

    print("Database records initialized successfully.")


# ======================================================
# 8. HOME PAGE
# ======================================================

@app.get("/")
def home():

    # Load the interface immediately.
    # No repeated database initialization.

    return render_template("index.html")


# ======================================================
# 9. FIRESTORE CONNECTION CHECK
# ======================================================

@app.get("/api/health")
def health():

    try:

        db = get_db()

        list(

            db.collection("patients")

            .limit(1)

            .stream(timeout=FIRESTORE_TIMEOUT)

        )

        return jsonify({

            "success": True,

            "message": "Firestore is connected.",

            "project": db.project

        })

    except Exception:

        app.logger.exception(
            "Firestore connection failed."
        )

        return error(

            "Unable to connect to Firestore.",

            503

        )


# ======================================================
# 10. READ ALL RECORDS
# ======================================================

@app.get("/api/<resource>")
def list_records(resource):

    if resource not in COLLECTIONS:

        return error(
            "Resource not found.",
            404
        )

    try:

        search = request.args.get(
            "q",
            ""
        ).strip().lower()

        documents = get_collection(
            resource
        ).stream(
            timeout=FIRESTORE_TIMEOUT
        )

        records = [

            serialize(doc)

            for doc in documents

        ]

        if search:

            records = [

                record

                for record in records

                if any(

                    search in str(value).lower()

                    for value in record.values()

                )

            ]

        records.sort(

            key=lambda item: str(
                item.get("created_at", "")
            ),

            reverse=True

        )

        return jsonify({

            "success": True,

            "count": len(records),

            "data": records

        })

    except Exception:

        app.logger.exception(
            "Unable to retrieve %s.",
            resource
        )

        return error(

            "Unable to retrieve records from Firestore.",

            503

        )


# ======================================================
# 11. READ SINGLE RECORD
# ======================================================

@app.get("/api/<resource>/<record_id>")
def get_record(resource, record_id):

    if resource not in COLLECTIONS:

        return error(
            "Resource not found.",
            404
        )

    try:

        document = get_collection(
            resource
        ).document(
            record_id
        ).get(
            timeout=FIRESTORE_TIMEOUT
        )

        if not document.exists:

            return error(
                "Record not found.",
                404
            )

        return jsonify({

            "success": True,

            "data": serialize(document)

        })

    except Exception:

        app.logger.exception(
            "Read operation failed."
        )

        return error(

            "Unable to retrieve the selected record.",

            500

        )


# ======================================================
# 12. CREATE RECORD
# ======================================================

@app.post("/api/<resource>")
def create_record(resource):

    if resource not in COLLECTIONS:

        return error(
            "Resource not found.",
            404
        )

    data = get_json_data()

    if data is None:

        return error(
            "Invalid request data."
        )

    data = filter_record_fields(
        resource,
        data
    )

    try:

        message = VALIDATORS[resource](data)

        if message:

            return error(message)

        record = dict(data)

        timestamp = now_utc()

        record["created_at"] = timestamp

        record["updated_at"] = timestamp

        if resource == "appointments":

            record = add_appointment_names(
                record
            )

        reference = get_collection(
            resource
        ).document()

        reference.set(

            record,

            timeout=FIRESTORE_TIMEOUT

        )

        return jsonify({

            "success": True,

            "message": "Record created successfully.",

            "id": reference.id,

            "data": {
                "id": reference.id,
                **record
            }

        }), 201

    except ValueError as exc:

        return error(
            str(exc),
            400
        )

    except Exception:

        app.logger.exception(
            "Create operation failed."
        )

        return error(

            "Unable to save the record.",

            500

        )


# ======================================================
# 13. UPDATE RECORD
# ======================================================

@app.put("/api/<resource>/<record_id>")
def update_record(resource, record_id):

    if resource not in COLLECTIONS:

        return error(
            "Resource not found.",
            404
        )

    data = get_json_data()

    if data is None:

        return error(
            "Invalid request data."
        )

    data = filter_record_fields(
        resource,
        data
    )

    try:

        reference = get_collection(
            resource
        ).document(
            record_id
        )

        existing = reference.get(
            timeout=FIRESTORE_TIMEOUT
        )

        if not existing.exists:

            return error(
                "Record not found.",
                404
            )

        message = VALIDATORS[resource](data)

        if message:

            return error(message)

        record = dict(data)

        record["updated_at"] = now_utc()

        if resource == "appointments":

            record = add_appointment_names(
                record
            )

        reference.update(

            record,

            timeout=FIRESTORE_TIMEOUT

        )

        old_data = existing.to_dict() or {}

        # Synchronize linked names only when changed.

        if resource in ["patients", "doctors"]:

            if old_data.get("full_name") != record["full_name"]:

                sync_appointment_names(

                    resource,

                    record_id,

                    record["full_name"]

                )

        return jsonify({

            "success": True,

            "message": "Record updated successfully.",

            "data": {
                "id": record_id,
                **record
            }

        })

    except ValueError as exc:

        return error(
            str(exc),
            400
        )

    except Exception:

        app.logger.exception(
            "Update operation failed."
        )

        return error(

            "Unable to update the record.",

            500

        )


# ======================================================
# 14. DELETE RECORD
# ======================================================

@app.delete("/api/<resource>/<record_id>")
def delete_record(resource, record_id):

    if resource not in COLLECTIONS:

        return error(
            "Resource not found.",
            404
        )

    try:

        reference = get_collection(
            resource
        ).document(
            record_id
        )

        existing = reference.get(
            timeout=FIRESTORE_TIMEOUT
        )

        if not existing.exists:

            return error(
                "Record not found.",
                404
            )

        # Protect linked patients and doctors.

        if resource in ["patients", "doctors"]:

            linked_field = (

                "patient_id"

                if resource == "patients"

                else "doctor_id"

            )

            linked = next(

                get_db()

                .collection("appointments")

                .where(
                    linked_field,
                    "==",
                    record_id
                )

                .limit(1)

                .stream(
                    timeout=FIRESTORE_TIMEOUT
                ),

                None

            )

            if linked is not None:

                return error(

                    "This record is linked to an appointment. "
                    "Remove the related appointment first.",

                    409

                )

        reference.delete(
            timeout=FIRESTORE_TIMEOUT
        )

        return jsonify({

            "success": True,

            "message": "Record deleted successfully."

        })

    except Exception:

        app.logger.exception(
            "Delete operation failed."
        )

        return error(

            "Unable to delete the record.",

            500

        )


# ======================================================
# 15. DASHBOARD STATISTICS
# ======================================================

@app.get("/api/dashboard")
def dashboard():

    try:

        db = get_db()

        patients = list(

            db.collection("patients")

            .stream(timeout=FIRESTORE_TIMEOUT)

        )

        doctors = list(

            db.collection("doctors")

            .stream(timeout=FIRESTORE_TIMEOUT)

        )

        appointments = [

            serialize(doc)

            for doc in db.collection("appointments")

            .stream(timeout=FIRESTORE_TIMEOUT)

        ]

        counts = {

            "patients": len(patients),

            "doctors": len(doctors),

            "appointments": len(appointments),

            "scheduled": sum(

                1

                for item in appointments

                if item.get("status") == "Scheduled"

            ),

            "completed": sum(

                1

                for item in appointments

                if item.get("status") == "Completed"

            ),

            "cancelled": sum(

                1

                for item in appointments

                if item.get("status") == "Cancelled"

            )

        }

        appointments.sort(

            key=lambda item: (

                str(item.get("appointment_date", "")),

                str(item.get("appointment_time", ""))

            ),

            reverse=True

        )

        return jsonify({

            "success": True,

            "data": {

                "counts": counts,

                "recent": appointments[:5]

            }

        })

    except Exception:

        app.logger.exception(
            "Dashboard operation failed."
        )

        return error(

            "Unable to load dashboard statistics.",

            503

        )


# ======================================================
# 16. ERROR HANDLERS
# ======================================================

@app.errorhandler(404)
def not_found(_):

    if request.path.startswith("/api/"):

        return error(
            "API endpoint not found.",
            404
        )

    return "Page not found.", 404


@app.errorhandler(500)
def internal_server_error(_):

    if request.path.startswith("/api/"):

        return error(
            "An internal server error occurred.",
            500
        )

    return "An internal server error occurred.", 500


# ======================================================
# 17. MAIN APPLICATION
# ======================================================

if __name__ == "__main__":

    port = int(
        os.getenv("PORT", "5000")
    )

    print("=" * 55)

    print("CAREPOINT CLINIC MANAGEMENT SYSTEM")

    print("=" * 55)

    print("Starting CarePoint...")

    print(f"Server: http://127.0.0.1:{port}")

    print("=" * 55)

    app.run(

        host="127.0.0.1",

        port=port,

        debug=False,

        use_reloader=False,

        threaded=True

    )