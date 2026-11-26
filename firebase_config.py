import os
import json
import firebase_admin

from firebase_admin import credentials, firestore
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(
    os.path.join(BASE_DIR, ".env"),
    override=False
)

_db = None


def get_db():
    global _db

    if _db is not None:
        return _db

    try:
        try:
            firebase_app = firebase_admin.get_app()

        except ValueError:

            # Vercel environment variable
            firebase_json = os.getenv(
                "FIREBASE_SERVICE_ACCOUNT"
            )

            if firebase_json:

                service_account = json.loads(
                    firebase_json
                )

                cred = credentials.Certificate(
                    service_account
                )

            else:

                # Local PyCharm environment
                credential_path = os.getenv(
                    "GOOGLE_APPLICATION_CREDENTIALS"
                )

                if not credential_path:
                    raise RuntimeError(
                        "Firebase credentials are missing."
                    )

                if not os.path.isabs(credential_path):
                    credential_path = os.path.join(
                        BASE_DIR,
                        credential_path
                    )

                if not os.path.isfile(credential_path):
                    raise FileNotFoundError(
                        "Firebase JSON file not found."
                    )

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
