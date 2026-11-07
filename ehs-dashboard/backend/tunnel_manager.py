import os
import sys
import re
import time
import shutil
import logging
import threading
import subprocess
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from database import SessionLocal
import models

logger = logging.getLogger("ehs_tunnel_manager")
logger.setLevel(logging.INFO)

class CloudflareTunnelManager:
    def __init__(self, project_root: str):
        self.project_root = project_root
        self.log_file = os.path.join(os.environ.get("TEMP", r"C:\Temp"), "ehs_cf.log")
        self.tunnel_file = os.path.join(self.project_root, "tunnel_url.txt")
        self._lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start_background_monitor(self):
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True, name="CFTunnelMonitor")
        self._thread.start()

    def stop_background_monitor(self):
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    def find_cloudflared_executable(self) -> Optional[str]:
        # 1. System PATH
        cf = shutil.which("cloudflared")
        if cf:
            return cf
        # 2. User bin (~/bin/cloudflared.exe)
        user_bin = os.path.expanduser(r"~\bin\cloudflared.exe")
        if os.path.isfile(user_bin):
            return user_bin
        # 3. Local AppData
        local_appdata = os.environ.get("LOCALAPPDATA", "")
        if local_appdata:
            p = os.path.join(local_appdata, "cloudflared", "cloudflared.exe")
            if os.path.isfile(p):
                return p
        # 4. Program Files
        prog_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        p = os.path.join(prog_files, "cloudflared", "cloudflared.exe")
        if os.path.isfile(p):
            return p
        # 5. Project root / parent
        for base in [self.project_root, os.path.dirname(self.project_root)]:
            p = os.path.join(base, "cloudflared.exe")
            if os.path.isfile(p):
                return p
        return None

    def is_process_running(self) -> bool:
        try:
            res = subprocess.run(
                ["tasklist", "/FI", "IMAGENAME eq cloudflared.exe"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return "cloudflared.exe" in res.stdout
        except Exception:
            return False

    def kill_cloudflared_process(self):
        try:
            subprocess.run(["taskkill", "/F", "/IM", "cloudflared.exe"], capture_output=True, timeout=5)
        except Exception:
            pass
        if os.path.isfile(self.tunnel_file):
            try:
                os.remove(self.tunnel_file)
            except Exception:
                pass

    def _extract_url_from_log(self) -> Optional[str]:
        if os.path.isfile(self.log_file):
            try:
                with open(self.log_file, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    m = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", content)
                    if m:
                        return m.group(0)
            except Exception:
                pass
        if os.path.isfile(self.tunnel_file):
            try:
                with open(self.tunnel_file, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read().strip()
                    if content.startswith("https://") and "trycloudflare.com" in content:
                        return content
            except Exception:
                pass
        return None

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            db = SessionLocal()
            try:
                now = datetime.now()
                # Find active session
                active = db.query(models.RemoteTunnelSession).filter(
                    models.RemoteTunnelSession.status == "active"
                ).order_by(models.RemoteTunnelSession.id.desc()).first()

                cf_running = self.is_process_running()

                if active:
                    # Check if expired
                    if now >= active.expires_at:
                        active.status = "expired"
                        active.stopped_at = now
                        db.commit()
                        self.kill_cloudflared_process()
                        active = None
                    elif not cf_running:
                        # Process died unexpectedly
                        active.status = "terminated"
                        active.stopped_at = now
                        db.commit()
                        active = None
                    elif not active.url:
                        # Try to discover URL if pending
                        found = self._extract_url_from_log()
                        if found:
                            active.url = found
                            db.commit()
                            with open(self.tunnel_file, "w", encoding="utf-8") as f:
                                f.write(found)

                # Find most recent expired or terminated session for display context
                last_session = db.query(models.RemoteTunnelSession).filter(
                    models.RemoteTunnelSession.status.in_(["expired", "terminated"])
                ).order_by(models.RemoteTunnelSession.id.desc()).first()

                session_data = None
                if active:
                    rem_sec = max(0, int((active.expires_at - now).total_seconds()))
                    session_data = {
                        "id": active.id,
                        "url": active.url,
                        "created_by_username": active.created_by_username,
                        "created_by_name": active.created_by_name,
                        "created_at": active.created_at.isoformat() if active.created_at else now.isoformat(),
                        "duration_minutes": active.duration_minutes,
                        "expires_at": active.expires_at.isoformat(),
                        "seconds_remaining": rem_sec,
                        "status": "active"
                    }

                last_data = None
                if last_session:
                    last_data = {
                        "id": last_session.id,
                        "url": last_session.url,
                        "created_by_username": last_session.created_by_username,
                        "created_by_name": last_session.created_by_name,
                        "created_at": last_session.created_at.isoformat() if last_session.created_at else "",
                        "duration_minutes": last_session.duration_minutes,
                        "expires_at": last_session.expires_at.isoformat() if last_session.expires_at else "",
                        "status": last_session.status,
                        "stopped_at": last_session.stopped_at.isoformat() if last_session.stopped_at else "",
                        "stopped_by_username": last_session.stopped_by_username
                    }

                return {
                    "active": session_data is not None and cf_running,
                    "session": session_data,
                    "last_session": last_data,
                    "cloudflared_installed": self.find_cloudflared_executable() is not None,
                    "server_time": now.isoformat()
                }
            finally:
                db.close()

    def start_tunnel(self, duration_minutes: int, username: str, full_name: str, force: bool = False) -> Dict[str, Any]:
        cf_exe = self.find_cloudflared_executable()
        if not cf_exe:
            raise RuntimeError("cloudflared executable was not found. Please install it or verify ~/bin/cloudflared.exe.")

        # Clamp duration to 20-30 minutes per requirements
        duration_minutes = max(20, min(30, int(duration_minutes or 30)))

        with self._lock:
            db = SessionLocal()
            try:
                now = datetime.now()
                # Check for existing active session
                existing = db.query(models.RemoteTunnelSession).filter(
                    models.RemoteTunnelSession.status == "active"
                ).order_by(models.RemoteTunnelSession.id.desc()).first()

                if existing and not force:
                    # Check if still valid
                    if now < existing.expires_at and self.is_process_running():
                        rem_sec = max(0, int((existing.expires_at - now).total_seconds()))
                        return {
                            "status": "already_active",
                            "message": f"Tunnel is already active, generated by {existing.created_by_name} (@{existing.created_by_username}).",
                            "session": {
                                "id": existing.id,
                                "url": existing.url,
                                "created_by_username": existing.created_by_username,
                                "created_by_name": existing.created_by_name,
                                "created_at": existing.created_at.isoformat() if existing.created_at else now.isoformat(),
                                "duration_minutes": existing.duration_minutes,
                                "expires_at": existing.expires_at.isoformat(),
                                "seconds_remaining": rem_sec,
                                "status": "active"
                            }
                        }
                    else:
                        existing.status = "expired" if now >= existing.expires_at else "terminated"
                        existing.stopped_at = now
                        db.commit()

                # Clean up previous run
                if existing and force:
                    existing.status = "terminated"
                    existing.stopped_at = now
                    existing.stopped_by_username = username
                    db.commit()

                self.kill_cloudflared_process()
                time.sleep(1)

                if os.path.isfile(self.log_file):
                    try:
                        os.remove(self.log_file)
                    except Exception:
                        pass

                # Launch cloudflared with CREATE_NO_WINDOW
                creationflags = 0x08000000 if sys.platform == "win32" else 0
                cmd = [cf_exe, "tunnel", "--url", "http://127.0.0.1:5174", "--logfile", self.log_file]
                subprocess.Popen(cmd, creationflags=creationflags, close_fds=True)

                # Wait for tunnel URL
                found_url = None
                start_wait = time.time()
                while time.time() - start_wait < 14:
                    if os.path.isfile(self.log_file):
                        try:
                            with open(self.log_file, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                                m = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", content)
                                if m:
                                    found_url = m.group(0)
                                    break
                        except Exception:
                            pass
                    time.sleep(0.5)

                if not found_url:
                    # Final check in log
                    if os.path.isfile(self.log_file):
                        try:
                            with open(self.log_file, "r", encoding="utf-8", errors="ignore") as f:
                                m = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", f.read())
                                if m:
                                    found_url = m.group(0)
                        except Exception:
                            pass

                expires_at = now + timedelta(minutes=duration_minutes)

                session_rec = models.RemoteTunnelSession(
                    url=found_url,
                    created_by_username=username,
                    created_by_name=full_name,
                    created_at=now,
                    duration_minutes=duration_minutes,
                    expires_at=expires_at,
                    status="active"
                )
                db.add(session_rec)
                db.commit()
                db.refresh(session_rec)

                if found_url:
                    with open(self.tunnel_file, "w", encoding="utf-8") as f:
                        f.write(found_url)

                return {
                    "status": "started",
                    "active": True,
                    "session": {
                        "id": session_rec.id,
                        "url": session_rec.url,
                        "created_by_username": session_rec.created_by_username,
                        "created_by_name": session_rec.created_by_name,
                        "created_at": session_rec.created_at.isoformat(),
                        "duration_minutes": session_rec.duration_minutes,
                        "expires_at": session_rec.expires_at.isoformat(),
                        "seconds_remaining": duration_minutes * 60,
                        "status": "active"
                    }
                }
            finally:
                db.close()

    def stop_tunnel(self, username: str, reason: str = "terminated") -> Dict[str, Any]:
        with self._lock:
            db = SessionLocal()
            try:
                now = datetime.now()
                active = db.query(models.RemoteTunnelSession).filter(
                    models.RemoteTunnelSession.status == "active"
                ).all()

                for s in active:
                    s.status = reason
                    s.stopped_at = now
                    s.stopped_by_username = username
                db.commit()

                self.kill_cloudflared_process()
                return {"status": "stopped", "active": False}
            finally:
                db.close()

    def _monitor_loop(self):
        while self._running:
            try:
                now = datetime.now()
                db = SessionLocal()
                try:
                    active = db.query(models.RemoteTunnelSession).filter(
                        models.RemoteTunnelSession.status == "active"
                    ).first()

                    if active:
                        if now >= active.expires_at:
                            logger.info(f"Tunnel session {active.id} reached expiry ({active.expires_at}). Stopping...")
                            active.status = "expired"
                            active.stopped_at = now
                            db.commit()
                            self.kill_cloudflared_process()
                        elif not self.is_process_running():
                            logger.warning(f"Tunnel session {active.id} process terminated unexpectedly.")
                            active.status = "terminated"
                            active.stopped_at = now
                            db.commit()
                        elif not active.url:
                            found = self._extract_url_from_log()
                            if found:
                                active.url = found
                                db.commit()
                                with open(self.tunnel_file, "w", encoding="utf-8") as f:
                                    f.write(found)
                            db.commit()
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")

            time.sleep(5)
