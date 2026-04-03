"""
Vercel Python serverless function for scraping recipes.
Uses recipe-scrapers (630+ supported sites).

Endpoint: POST /api/scrape-recipe
Body: { "url": "https://..." }
Header: x-admin-password: <password>
"""

import json
import os
import re
from http.server import BaseHTTPRequestHandler


def parse_servings(yields_str):
    if not yields_str:
        return None
    match = re.search(r"(\d+)", str(yields_str))
    return int(match.group(1)) if match else None


def slugify(text):
    slug = text.lower()
    slug = re.sub(r"['']", "", slug)
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug


def format_time(minutes):
    if not minutes:
        return None
    try:
        mins = int(minutes)
    except (ValueError, TypeError):
        return str(minutes)
    if mins >= 60:
        hours = mins // 60
        remaining = mins % 60
        if remaining:
            return f"{hours} hr {remaining} min"
        return f"{hours} hr"
    return f"{mins} min"


def scrape_url(url):
    from recipe_scrapers import scrape_me

    scraper = scrape_me(url)

    title = scraper.title() or ""
    ingredients = scraper.ingredients() or []
    instructions_text = scraper.instructions() or ""
    instructions = [s.strip() for s in instructions_text.split("\n") if s.strip()]

    tags = []
    try:
        category = scraper.category()
        if category:
            tags.append(category.strip().lower())
    except Exception:
        pass
    try:
        keywords = scraper.keywords()
        if keywords:
            if isinstance(keywords, str):
                tags.extend(k.strip().lower() for k in re.split(r"[,;]+", keywords) if k.strip())
            elif isinstance(keywords, list):
                tags.extend(k.strip().lower() for k in keywords if k.strip())
    except Exception:
        pass
    tags = list(dict.fromkeys(tags))

    return {
        "recipe": {
            "slug": slugify(title),
            "title": title,
            "description": getattr(scraper, "description", lambda: None)(),
            "tags": tags,
            "source": url,
            "prepTime": format_time(scraper.prep_time()),
            "cookTime": format_time(scraper.cook_time()),
            "servings": parse_servings(scraper.yields()),
            "ingredients": ingredients,
            "instructions": instructions,
            "dateAdded": None,
        },
        "imageUrl": scraper.image() or None,
    }


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Auth check
        admin_password = os.environ.get("ADMIN_PASSWORD", "")
        request_password = self.headers.get("x-admin-password", "")
        if request_password != admin_password:
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Unauthorized"}).encode())
            return

        # Parse body
        content_length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(content_length))
        url = body.get("url", "")

        if not url:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "URL is required"}).encode())
            return

        try:
            result = scrape_url(url)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
