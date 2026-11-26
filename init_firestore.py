from time import perf_counter

from app import app, initialize_records
from firebase_config import get_db


def initialize_database():

    start = perf_counter()

    print("=" * 55)
    print("CAREPOINT DATABASE INITIALIZATION")
    print("=" * 55)

    try:
        db = get_db()

        print(f"Project ID: {db.project}")
        print("Connecting to Firestore...")

        # Test Firestore connection
        list(
            db.collection("patients")
            .limit(1)
            .stream(timeout=15)
        )

        print("Firestore connected successfully.")

        # Initialize database records
        with app.app_context():
            initialize_records()

        elapsed = perf_counter() - start

        print("=" * 55)
        print("Database is ready.")
        print(f"Elapsed time: {elapsed:.2f} seconds")
        print("=" * 55)

    except Exception as exc:

        print("=" * 55)
        print("DATABASE CONNECTION FAILED")
        print(str(exc))
        print("=" * 55)

        raise SystemExit(1)


if __name__ == "__main__":
    initialize_database()
