#!/usr/bin/env python3
"""Context7 documentation lookup - fetch up-to-date library docs."""

import json
import os
import sys
import urllib.parse
import urllib.request
from urllib.error import HTTPError, URLError

BASE_URL = "https://context7.com/api/v2"
TIMEOUT = 30


def get_headers():
    """Build request headers with optional API key."""
    headers = {
        "User-Agent": "pi-skill/1.0",
        "Accept": "application/json",
    }
    api_key = os.environ.get("CONTEXT7_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def search_library(library_name: str, query: str = "") -> None:
    """Search for a library by name."""
    params = {"libraryName": library_name}
    if query:
        params["query"] = query
    
    url = f"{BASE_URL}/libs/search?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=get_headers())
    
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            data = json.loads(response.read().decode("utf-8"))
            
            # Handle both array and {results: [...]} formats
            results = data.get("results", data) if isinstance(data, dict) else data
            
            if not results:
                print(f"No libraries found matching '{library_name}'.")
                print("Try a different name or check spelling.")
                return
            
            print(f"## Libraries matching '{library_name}'")
            print()
            
            for lib in results[:10]:  # Show top 10 matches
                lib_id = lib.get("id", "N/A")
                name = lib.get("title") or lib.get("name", "Unknown")
                desc = lib.get("description", "No description")
                snippets = lib.get("totalSnippets", 0)
                trust = lib.get("trustScore", "N/A")
                versions = lib.get("versions", [])
                
                print(f"### {name}")
                print(f"- **ID:** `{lib_id}`")
                print(f"- **Description:** {desc[:200]}{'...' if len(desc) > 200 else ''}")
                print(f"- **Documentation snippets:** {snippets}")
                print(f"- **Trust score:** {trust}")
                if versions:
                    print(f"- **Versions:** {', '.join(versions[:5])}")
                print()
            
            if len(results) > 10:
                print(f"_Showing 10 of {len(results)} results._")
                
    except HTTPError as e:
        handle_http_error(e)
    except URLError as e:
        print(f"Error: Connection failed - {e.reason}", file=sys.stderr)
        sys.exit(1)


def get_docs(library_id: str, query: str) -> None:
    """Get documentation context for a library."""
    params = {
        "libraryId": library_id,
        "query": query,
        "type": "txt",  # Plain text format for LLM consumption
    }
    
    url = f"{BASE_URL}/context?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers=get_headers())
    
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
            content = response.read().decode("utf-8").strip()
            
            if not content:
                print(f"No documentation found for query '{query}' in {library_id}.")
                print("Try a more specific or different query.")
                return
            
            print(f"## Documentation: {library_id}")
            print(f"**Query:** {query}")
            print()
            print(content)
            
    except HTTPError as e:
        handle_http_error(e)
    except URLError as e:
        print(f"Error: Connection failed - {e.reason}", file=sys.stderr)
        sys.exit(1)


def handle_http_error(e: HTTPError) -> None:
    """Handle HTTP errors with helpful messages."""
    error_messages = {
        202: "Library not fully indexed yet. Try again later.",
        301: "Library has been moved. Check the response for the new ID.",
        400: "Invalid request parameters. Check your query.",
        401: "Invalid API key. Check your CONTEXT7_API_KEY.",
        403: "Access denied. You may not have permission for this library.",
        404: "Library not found. Use 'search' to find the correct ID.",
        422: "Library is too large or has no processable code.",
        429: "Rate limit exceeded. Wait a moment and try again, or add an API key.",
        500: "Server error. Try again later.",
        503: "Service unavailable. Try again later.",
    }
    
    msg = error_messages.get(e.code, f"HTTP {e.code}")
    print(f"Error: {msg}", file=sys.stderr)
    
    try:
        body = json.loads(e.read().decode("utf-8"))
        if "message" in body:
            print(f"Details: {body['message']}", file=sys.stderr)
    except:
        pass
    
    sys.exit(1)


def print_usage():
    """Print usage information."""
    print("Context7 Documentation Lookup")
    print()
    print("Usage:")
    print("  docs.py search <library-name> [query]    Search for a library")
    print("  docs.py docs <library-id> <query>        Get documentation")
    print()
    print("Environment:")
    print("  CONTEXT7_API_KEY    Optional. Your Context7 API key for higher rate limits.")
    print()
    print("Examples:")
    print('  docs.py search react "hooks"')
    print('  docs.py docs /facebook/react "useEffect cleanup"')
    print('  docs.py search nextjs "app router"')
    print('  docs.py docs /vercel/next.js "server components"')
    print()
    print("Get an API key at https://context7.com/dashboard")


def main():
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "search":
        if len(sys.argv) < 3:
            print("Error: Missing library name", file=sys.stderr)
            print("Usage: docs.py search <library-name> [query]")
            sys.exit(1)
        
        library_name = sys.argv[2]
        query = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""
        search_library(library_name, query)
        
    elif command == "docs":
        if len(sys.argv) < 4:
            print("Error: Missing library ID or query", file=sys.stderr)
            print("Usage: docs.py docs <library-id> <query>")
            print()
            print("First use 'search' to find the library ID:")
            print('  docs.py search react "hooks"')
            sys.exit(1)
        
        library_id = sys.argv[2]
        query = " ".join(sys.argv[3:])
        get_docs(library_id, query)
        
    elif command in ("--help", "-h", "help"):
        print_usage()
        
    else:
        print(f"Error: Unknown command '{command}'", file=sys.stderr)
        print("Use 'search' or 'docs'. Run with --help for usage.")
        sys.exit(1)


if __name__ == "__main__":
    main()
