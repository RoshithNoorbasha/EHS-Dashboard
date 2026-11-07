"""
Greenko Pinnapuram Cluster EHS Dashboard - Source Code Encryption Engine
Encrypts all backend Python files into unreadable, obfuscated binary payloads.
Original readable source files are safely backed up in `backend/.dev_source_backup`.
"""

import os
import shutil
import marshal
import zlib
import base64

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BACKEND_DIR, ".dev_source_backup")

# Encryption key for scrambling byte arrays
SECRET_CIPHER_KEY = b"greenko_pinnapuram_cluster_ehs_secure_key_2026_x89"

# Target Python files to encrypt
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

TEMPLATE = '''# -------------------------------------------------------------------------
# GREENKO PINNAPURAM CLUSTER EHS DASHBOARD
# PRODUCTION ENCRYPTED MODULE - PROPRIETARY & CONFIDENTIAL
# WARNING: This file is encrypted binary bytecode. Manual edits will corrupt the application.
# -------------------------------------------------------------------------
import marshal as _m, zlib as _z, base64 as _b
_K = {cipher_key!r}
_P = {payload!r}
_d = bytes(b ^ _K[i % len(_K)] for i, b in enumerate(_b.b85decode(_P)))
exec(_m.loads(_z.decompress(_d)), globals())
'''

def backup_original_sources():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    for fname in TARGET_FILES:
        src_path = os.path.join(BACKEND_DIR, fname)
        dst_path = os.path.join(BACKUP_DIR, fname)
        if os.path.isfile(src_path):
            # Only backup if not already encrypted
            with open(src_path, "r", encoding="utf-8", errors="ignore") as f:
                first_line = f.readline()
                if "PRODUCTION ENCRYPTED MODULE" not in first_line:
                    shutil.copy2(src_path, dst_path)
                    print(f"[BACKUP] Saved readable source: {fname}")

def encrypt_file(fname):
    backup_path = os.path.join(BACKUP_DIR, fname)
    target_path = os.path.join(BACKEND_DIR, fname)

    # Always read source from backup directory to prevent double-encryption
    if not os.path.isfile(backup_path):
        print(f"[SKIP] Source file not found in backup: {fname}")
        return

    with open(backup_path, "r", encoding="utf-8") as f:
        source_code = f.read()

    # Compile source code to Python code object
    code_obj = compile(source_code, f"<{fname}_encrypted>", "exec")
    marshaled = marshal.dumps(code_obj)
    compressed = zlib.compress(marshaled, 9)

    # XOR scramble with key
    scrambled = bytes(b ^ SECRET_CIPHER_KEY[i % len(SECRET_CIPHER_KEY)] for i, b in enumerate(compressed))
    payload_b85 = base64.b85encode(scrambled)

    # Render template
    encrypted_content = TEMPLATE.format(
        cipher_key=SECRET_CIPHER_KEY,
        payload=payload_b85
    )

    with open(target_path, "w", encoding="utf-8") as f:
        f.write(encrypted_content)

    orig_size = len(source_code)
    enc_size = len(encrypted_content)
    print(f"[ENCRYPTED] {fname}: {orig_size} bytes -> {enc_size} encrypted bytes (Unreadable)")

def main():
    print("=" * 70)
    print("  EHS Dashboard Backend Code Encryption")
    print("=" * 70)
    backup_original_sources()
    print("-" * 70)
    for fname in TARGET_FILES:
        encrypt_file(fname)
    print("=" * 70)
    print("[SUCCESS] All backend Python files are now encrypted.")
    print("Opening these files in Notepad or VS Code will now show scrambled gibberish.")
    print("To restore readable source on this dev PC at any time, run: python restore_dev_source.py")
    print("=" * 70)

if __name__ == "__main__":
    main()

