"""
Greenko Pinnapuram Cluster EHS Dashboard - Source Code Restore Utility
Restores clean, readable development Python files from `backend/.dev_source_backup`.
"""

import os
import shutil

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BACKEND_DIR, ".dev_source_backup")

TARGET_FILES = [
    "main.py",
    "models.py",
    "schemas.py",
    "database.py",
    "calculators.py",
    "git_sync.py",
    "tunnel_manager.py",
    "seed.py",
]

def main():
    if not os.path.isdir(BACKUP_DIR):
        print("[ERROR] Backup directory .dev_source_backup does not exist. Cannot restore.")
        return

    print("=" * 70)
    print("  Restoring Clean Readable Source Code for Development")
    print("=" * 70)

    for fname in TARGET_FILES:
        backup_path = os.path.join(BACKUP_DIR, fname)
        target_path = os.path.join(BACKEND_DIR, fname)

        if os.path.isfile(backup_path):
            shutil.copy2(backup_path, target_path)
            print(f"[RESTORED] {fname} (readable source restored)")
        else:
            print(f"[SKIP] No backup found for {fname}")

    print("=" * 70)
    print("[SUCCESS] All files restored to clean readable source code.")
    print("=" * 70)

if __name__ == "__main__":
    main()
