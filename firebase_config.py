import os
import firebase_admin

from firebase_admin import credentials, firestore
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(
    os.path.join(BASE_DIR, ".env"),
    override=True
)

_db = None


def get_db():
    global _db

    if _db is not None:
        return _db

    try:
        credential_path = os.getenv(
            "GOOGLE_APPLICATION_CREDENTIALS"
        )

        if not credential_path:
            raise RuntimeError(
                "Firebase credentials are missing in .env"
            )

        if not os.path.isabs(credential_path):
            credential_path = os.path.join(
                BASE_DIR,
                credential_path
            )

        if not os.path.isfile(credential_path):
            raise FileNotFoundError(
                f"Firebase JSON file not found: {credential_path}"
            )

        try:
            firebase_app = firebase_admin.get_app()

        except ValueError:
            cred = credentials.Certificate(
                credential_path
            )

            firebase_app = firebase_admin.initialize_app(
                cred
            )

        _db = firestore.client(app=firebase_app)

        print("Firebase initialized successfully!")
        print("Firebase Project:", firebase_app.project_id)

        return _db

    except Exception as e:
        print("Firebase connection error:", str(e))
        raise