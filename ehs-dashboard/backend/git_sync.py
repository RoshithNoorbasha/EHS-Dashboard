import os
import sys
import time
import threading
import subprocess
from datetime import datetime
from typing import Dict, Any, List, Optional

class GitSyncService:
    def __init__(self, root_dir: str, branch: str = "main", interval_seconds: int = 30):
        self.root_dir = root_dir
        self.branch = branch
        self.interval_seconds = interval_seconds
        self.enabled = True
        self._running = False
        self._thread: Optional[threading.Thread] = None

        self.last_checked_at: Optional[str] = None
        self.last_pulled_at: Optional[str] = None
        self.last_sync_status: str = "initialized"
        self.last_error: Optional[str] = None
        self.recent_logs: List[Dict[str, Any]] = []

        # Find true git directory (handles root vs subfolder)
        self.git_dir = self._detect_git_root()
        self._log("GitSyncService initialized", "info")

    def _detect_git_root(self) -> str:
        # Check current root_dir
        if os.path.isdir(os.path.join(self.root_dir, ".git")):
            return self.root_dir
        # Check parent dir
        parent = os.path.dirname(self.root_dir)
        if os.path.isdir(os.path.join(parent, ".git")):
            return parent
        # Try git rev-parse
        try:
            res = subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                cwd=self.root_dir,
                capture_output=True,
                text=True,
                timeout=5
            )
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
        except Exception:
            pass
        return self.root_dir

    def _log(self, message: str, level: str = "info"):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message
        }
        self.recent_logs.append(entry)
        if len(self.recent_logs) > 30:
            self.recent_logs.pop(0)

    def start(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._worker_loop, daemon=True, name="GitAutoSyncThread")
        self._thread.start()
        self._log("Auto-sync background daemon started (checking every %ss)" % self.interval_seconds, "info")

    def stop(self):
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)
        self._log("Auto-sync background daemon stopped", "info")

    def _worker_loop(self):
        # Initial brief wait before first cycle to let server startup settle
        time.sleep(5)
        while self._running:
            if self.enabled:
                try:
                    self.check_and_pull()
                except Exception as e:
                    self.last_sync_status = "error"
                    self.last_error = str(e)
                    self._log(f"Sync cycle exception: {str(e)}", "error")
            for _ in range(self.interval_seconds):
                if not self._running:
                    break
                time.sleep(1)

    def _run_git_cmd(self, args: List[str], timeout: int = 25) -> subprocess.CompletedProcess:
        # Prevent git interactive prompts from hanging
        env = os.environ.copy()
        env["GIT_TERMINAL_PROMPT"] = "0"
        return subprocess.run(
            args,
            cwd=self.git_dir,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env
        )

    def check_and_pull(self, force: bool = False) -> Dict[str, Any]:
        self.last_checked_at = datetime.now().isoformat()
        self.last_sync_status = "checking"

        # 1. Verify git repository
        chk = self._run_git_cmd(["git", "rev-parse", "--is-inside-work-tree"], timeout=5)
        if chk.returncode != 0:
            self.last_sync_status = "not_a_git_repo"
            return {"status": "not_a_git_repo", "message": "Not a git repository"}

        # 2. Fetch latest commits from remote origin quietly
        fetch_res = self._run_git_cmd(["git", "fetch", "origin", self.branch], timeout=25)
        if fetch_res.returncode != 0:
            err = fetch_res.stderr.strip() or "Failed to contact git remote"
            self.last_sync_status = "error"
            self.last_error = err
            self._log(f"Fetch failed: {err}", "warning")
            return {"status": "error", "error": err}

        # 3. Compare local HEAD with remote branch
        head_res = self._run_git_cmd(["git", "rev-parse", "HEAD"], timeout=5)
        remote_res = self._run_git_cmd(["git", "rev-parse", f"origin/{self.branch}"], timeout=5)

        if head_res.returncode != 0 or remote_res.returncode != 0:
            self.last_sync_status = "error"
            return {"status": "error", "error": "Could not parse commit hashes"}

        local_commit = head_res.stdout.strip()
        remote_commit = remote_res.stdout.strip()

        if local_commit == remote_commit and not force:
            self.last_sync_status = "up_to_date"
            self.last_error = None
            return {
                "status": "up_to_date",
                "local_commit": local_commit,
                "remote_commit": remote_commit,
                "message": "Local server is up to date with origin/main"
            }

        # 4. Remote has new commits! Perform git pull
        self._log(f"New commits detected on remote ({remote_commit[:7]}). Pulling changes...", "info")

        # Make sure runtime SQLite db is assumed unchanged to prevent merge blocking
        db_rel = os.path.join("ehs-dashboard", "backend", "ehs_dashboard.db")
        self._run_git_cmd(["git", "update-index", "--assume-unchanged", db_rel], timeout=5)

        pull_res = self._run_git_cmd(["git", "pull", "--ff-only", "origin", self.branch], timeout=35)
        if pull_res.returncode != 0:
            # Fallback to standard git pull if ff-only fails
            pull_res = self._run_git_cmd(["git", "pull", "origin", self.branch], timeout=35)

        if pull_res.returncode != 0:
            err = pull_res.stderr.strip() or "Git pull failed"
            self.last_sync_status = "error"
            self.last_error = err
            self._log(f"Pull failed: {err}", "error")
            return {"status": "error", "error": err, "stderr": pull_res.stderr}

        # 5. Success! Check what was changed
        self.last_pulled_at = datetime.now().isoformat()
        self.last_sync_status = "updated"
        self.last_error = None

        diff_res = self._run_git_cmd(["git", "diff", "--name-only", f"{local_commit}", "HEAD"], timeout=10)
        changed_files = diff_res.stdout.strip().splitlines() if diff_res.returncode == 0 else []

        commit_info_res = self._run_git_cmd(["git", "log", "-1", "--pretty=format:%h - %s (%an, %cr)"], timeout=5)
        commit_summary = commit_info_res.stdout.strip() if commit_info_res.returncode == 0 else remote_commit[:7]

        self._log(f"Updated successfully to {commit_summary}. {len(changed_files)} files modified.", "success")

        # 6. Automatic dependency installation if package.json or requirements.txt changed
        pkg_changed = any("package.json" in f for f in changed_files)
        req_changed = any("requirements.txt" in f for f in changed_files)

        if req_changed:
            self._log("requirements.txt was updated. Upgrading backend dependencies...", "info")
            try:
                backend_dir = os.path.join(self.root_dir, "backend") if "ehs-dashboard" in self.root_dir else os.path.join(self.root_dir, "ehs-dashboard", "backend")
                pip_exe = sys.executable
                subprocess.Popen(
                    [pip_exe, "-m", "pip", "install", "-r", "requirements.txt"],
                    cwd=backend_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception as e:
                self._log(f"Failed to auto-pip install: {e}", "warning")

        if pkg_changed:
            self._log("package.json was updated. Updating frontend dependencies...", "info")
            try:
                frontend_dir = os.path.join(self.root_dir, "frontend") if "ehs-dashboard" in self.root_dir else os.path.join(self.root_dir, "ehs-dashboard", "frontend")
                subprocess.Popen(
                    ["npm", "install"],
                    cwd=frontend_dir,
                    shell=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception as e:
                self._log(f"Failed to auto-npm install: {e}", "warning")

        return {
            "status": "updated",
            "previous_commit": local_commit,
            "new_commit": remote_commit,
            "commit_summary": commit_summary,
            "changed_files_count": len(changed_files),
            "output": pull_res.stdout.strip(),
            "timestamp": self.last_pulled_at
        }

    def get_status(self) -> Dict[str, Any]:
        local_commit = "unknown"
        remote_commit = "unknown"
        current_branch = self.branch
        remote_url = ""

        try:
            b_res = self._run_git_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"], timeout=3)
            if b_res.returncode == 0:
                current_branch = b_res.stdout.strip()
            
            l_res = self._run_git_cmd(["git", "log", "-1", "--pretty=format:%h - %s (%ci)"], timeout=3)
            if l_res.returncode == 0:
                local_commit = l_res.stdout.strip()
            
            r_res = self._run_git_cmd(["git", "config", "--get", "remote.origin.url"], timeout=3)
            if r_res.returncode == 0:
                remote_url = r_res.stdout.strip()

            rc_res = self._run_git_cmd(["git", "rev-parse", f"origin/{self.branch}"], timeout=3)
            if rc_res.returncode == 0:
                remote_commit = rc_res.stdout.strip()[:7]
        except Exception:
            pass

        return {
            "enabled": self.enabled,
            "interval_seconds": self.interval_seconds,
            "git_root": self.git_dir,
            "branch": current_branch,
            "remote_url": remote_url,
            "local_commit": local_commit,
            "remote_commit": remote_commit,
            "last_checked_at": self.last_checked_at,
            "last_pulled_at": self.last_pulled_at,
            "last_sync_status": self.last_sync_status,
            "last_error": self.last_error,
            "recent_logs": self.recent_logs[-15:],
            "is_up_to_date": self.last_sync_status == "up_to_date"
        }

