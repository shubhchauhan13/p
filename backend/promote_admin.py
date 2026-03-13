import sqlite3
import sys

def promote_user(email_or_username):
    conn = sqlite3.connect("polymarket.db")
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET is_admin = 1 WHERE username = ? OR email = ?", (email_or_username, email_or_username))
    conn.commit()
    rows = cursor.rowcount
    conn.close()
    if rows > 0:
        print(f"Successfully promoted '{email_or_username}' to admin.")
    else:
        print(f"User '{email_or_username}' not found.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        promote_user(sys.argv[1])
    else:
        promote_user("testuser")
