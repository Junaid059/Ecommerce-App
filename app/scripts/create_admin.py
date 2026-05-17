"""Promote an existing user to admin (or create one).

Usage:
    python -m app.scripts.create_admin admin@example.com mypassword
"""
import sys
from app.database import SessionLocal
from app.models import models
from app.utils import hashPassword


def main():
    if len(sys.argv) != 3:
        print("Usage: python -m app.scripts.create_admin <email> <password>")
        sys.exit(1)
    email, password = sys.argv[1], sys.argv[2]
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            user.role = "admin"
            print(f"Promoted existing user {email} to admin.")
        else:
            user = models.User(email=email, password=hashPassword(password), role="admin")
            db.add(user)
            print(f"Created new admin user {email}.")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
