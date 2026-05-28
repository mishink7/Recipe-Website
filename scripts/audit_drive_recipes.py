"""
Diagnostic: list every file in the Google Drive recipe folder tree.

The main importer (scripts/import_recipes.py) ONLY picks up files of
mimeType "application/vnd.google-apps.document" (native Google Docs).
Anything else - PDFs, uploaded .docx, images, shortcuts, text files -
is silently dropped with no log line.

This script walks the same folder tree and prints EVERY file, grouped
by mimeType, so you can see exactly which recipes the importer skipped
and why.

Usage:
    python scripts/audit_drive_recipes.py

Reads credentials from credentials.json / token.json in the project
root. If those files aren't present in the worktree, falls back to
the main repo at C:/Users/mishi/Desktop/Projects/Recipe-Website/.
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# --- Locate credentials ---
WORKTREE_ROOT = Path(__file__).resolve().parent.parent
MAIN_ROOT = Path("C:/Users/mishi/Desktop/Projects/Recipe-Website")


def find_creds_dir():
    for candidate in (WORKTREE_ROOT, MAIN_ROOT):
        if (candidate / "credentials.json").exists() and (candidate / "token.json").exists():
            return candidate
    print("ERROR: credentials.json + token.json not found in worktree or main repo.")
    sys.exit(1)


CREDS_DIR = find_creds_dir()
CREDENTIALS_FILE = CREDS_DIR / "credentials.json"
TOKEN_FILE = CREDS_DIR / "token.json"

FOLDER_ID = "11dRS2TGIVUW2CrvqRfDqa7IM0WydE9rj"

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
]

IMPORTABLE = {"application/vnd.google-apps.document"}
RECURSE_INTO = {"application/vnd.google-apps.folder"}
RECIPES_JSON = WORKTREE_ROOT / "src" / "data" / "recipes.json"


def slugify(text):
    """Same slugify used by import_recipes.py."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def load_recipe_index():
    """Return (set_of_slugs, set_of_lowercased_titles)."""
    with open(RECIPES_JSON, "r", encoding="utf-8") as f:
        recipes = json.load(f)
    slugs = {r["slug"] for r in recipes}
    titles = {r["title"].lower().strip() for r in recipes}
    return slugs, titles


def normalize_name(name):
    """Strip .docx and trailing whitespace before comparison."""
    n = name.strip()
    if n.lower().endswith(".docx"):
        n = n[:-5].strip()
    return n


def is_in_data(name, slugs, titles):
    norm = normalize_name(name)
    return slugify(norm) in slugs or norm.lower() in titles


def get_credentials():
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                creds = None
        if not creds:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return creds


def list_folder_contents(drive_service, folder_id):
    items = []
    page_token = None
    while True:
        results = drive_service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            fields="nextPageToken, files(id, name, mimeType, webViewLink, shortcutDetails)",
            pageToken=page_token,
            pageSize=100,
        ).execute()
        items.extend(results.get("files", []))
        page_token = results.get("nextPageToken")
        if not page_token:
            break
    return items


def walk(drive_service, folder_id, path=None):
    if path is None:
        path = []
    for item in list_folder_contents(drive_service, folder_id):
        if item["mimeType"] in RECURSE_INTO:
            yield from walk(drive_service, item["id"], path + [item["name"]])
        else:
            yield path, item


def resolve_shortcut(drive_service, item):
    """For a shortcut, fetch the target file metadata (name, mimeType)."""
    details = item.get("shortcutDetails") or {}
    target_id = details.get("targetId")
    if not target_id:
        return None
    try:
        return drive_service.files().get(
            fileId=target_id,
            fields="id, name, mimeType, webViewLink",
        ).execute()
    except Exception as e:
        return {"error": str(e)}


def main():
    print("=== Drive Recipe Audit ===\n")
    print(f"Using credentials from: {CREDS_DIR}\n")

    creds = get_credentials()
    drive_service = build("drive", "v3", credentials=creds)

    slugs, titles = load_recipe_index()
    print(f"Loaded {len(slugs)} recipes from recipes.json\n")

    print(f"Walking folder: {FOLDER_ID}\n")

    by_mime = defaultdict(list)
    total = 0
    for folder_path, item in walk(drive_service, FOLDER_ID):
        by_mime[item["mimeType"]].append((folder_path, item))
        total += 1

    print(f"Total files (non-folder): {total}\n")
    print("Breakdown by mimeType:")
    for mime, files in sorted(by_mime.items(), key=lambda kv: -len(kv[1])):
        status = "[IMPORTED]" if mime in IMPORTABLE else "[SKIPPED]"
        print(f"  {status} {mime}: {len(files)}")

    # Truly missing = not in recipes.json by slug or title.
    truly_missing = []  # (folder_path, item, reason)
    duplicates = []     # (folder_path, item, reason) -- shortcut/skipped but recipe IS in data

    for mime, files in by_mime.items():
        if mime in IMPORTABLE:
            continue
        for folder_path, item in files:
            if mime == "application/vnd.google-apps.shortcut":
                target = resolve_shortcut(drive_service, item)
                target_name = (target or {}).get("name") or item["name"]
                if is_in_data(target_name, slugs, titles) or is_in_data(item["name"], slugs, titles):
                    duplicates.append((folder_path, item, f"shortcut -> '{target_name}' already in data"))
                else:
                    truly_missing.append((folder_path, item, f"shortcut to '{target_name}' (target not in data)"))
            else:
                if is_in_data(item["name"], slugs, titles):
                    duplicates.append((folder_path, item, "name matches existing recipe"))
                else:
                    truly_missing.append((folder_path, item, "not in recipes.json"))

    print(f"\n--- TRULY MISSING from website ({len(truly_missing)}) ---")
    for folder_path, item, reason in sorted(truly_missing, key=lambda x: (x[0], x[1]["name"])):
        location = " > ".join(folder_path) if folder_path else "(root)"
        link = item.get("webViewLink", "(no link)")
        print(f"  [{location}] {item['name']}")
        print(f"    reason: {reason}")
        print(f"    {link}")

    print(f"\n--- SKIPPED BUT ALREADY IN DATA ({len(duplicates)}) ---")
    for folder_path, item, reason in sorted(duplicates, key=lambda x: (x[0], x[1]["name"])):
        location = " > ".join(folder_path) if folder_path else "(root)"
        print(f"  [{location}] {item['name']}  -- {reason}")

    print("\n--- IMPORTED GOOGLE DOCS ---")
    docs = by_mime.get("application/vnd.google-apps.document", [])
    print(f"  {len(docs)} Google Docs found across all folders.")


if __name__ == "__main__":
    main()
