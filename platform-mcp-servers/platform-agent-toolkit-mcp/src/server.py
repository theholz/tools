"""
Platform Agent Toolkit MCP - Letta + Google Workspace Tools
Letta memory, Gmail, Calendar, Drive, Tasks, Sheets, Docs, Slides.
"""
import os
import logging
from typing import Any, Dict, List, Optional
from mcp.server.fastmcp import FastMCP

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("platform-agent-toolkit-mcp")

mcp = FastMCP("platform-agent-toolkit-mcp")

# ============================================================================
# LETTA CLIENT TOOLS (Agent Memory)
# ============================================================================

@mcp.tool()
async def get_letta_memory(agent_id: str, memory_type: str = "core") -> Dict[str, Any]:
    """Get memory from Letta agent."""
    try:
        import httpx
        letta_url = os.getenv("LETTA_URL", "http://letta:8283")
        letta_api_key = os.getenv("LETTA_API_KEY")
        
        if not letta_api_key:
            return {"error": "LETTA_API_KEY not set", "success": False}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{letta_url}/api/v1/agents/{agent_id}/memory/{memory_type}",
                headers={"Authorization": f"Bearer {letta_api_key}"},
                timeout=10
            )
            if response.status_code == 200:
                return {"agent_id": agent_id, "memory_type": memory_type, "memory": response.json(), "success": True}
            return {"error": f"Letta API returned {response.status_code}", "agent_id": agent_id, "success": False}
    except Exception as e:
        logger.error(f"Letta memory retrieval error: {e}")
        return {"error": str(e), "agent_id": agent_id, "success": False}

@mcp.tool()
async def add_to_letta_memory(agent_id: str, content: str, memory_type: str = "core") -> Dict[str, Any]:
    """Add content to Letta agent memory."""
    try:
        import httpx
        letta_url = os.getenv("LETTA_URL", "http://letta:8283")
        letta_api_key = os.getenv("LETTA_API_KEY")
        
        if not letta_api_key:
            return {"error": "LETTA_API_KEY not set", "success": False}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{letta_url}/api/v1/agents/{agent_id}/memory/{memory_type}",
                headers={"Authorization": f"Bearer {letta_api_key}", "Content-Type": "application/json"},
                json={"content": content},
                timeout=10
            )
            if response.status_code in [200, 201]:
                return {"agent_id": agent_id, "memory_type": memory_type, "content_added": content[:100] + "..." if len(content) > 100 else content, "success": True}
            return {"error": f"Letta API returned {response.status_code}", "agent_id": agent_id, "success": False}
    except Exception as e:
        logger.error(f"Letta memory addition error: {e}")
        return {"error": str(e), "agent_id": agent_id, "success": False}

# ============================================================================
# GOOGLE WORKSPACE TOOLS (Gmail, Calendar, Drive, Tasks)
# ============================================================================

def _get_google_service(service_name: str, version: str, scopes: List[str]):
    """Get authenticated Google service client. Tries service-specific token, then generic google_token.pickle."""
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        import pickle

        client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")
        if not client_id or not client_secret:
            return None

        token_locations = [
            f"/tmp/google_tokens/google_{service_name}_token.pickle",
            f"/tmp/google_{service_name}_token.pickle",
            "/tmp/google_tokens/google_token.pickle",
            "/tmp/google_token.pickle",
        ]
        creds = None
        token_file = None

        for loc in token_locations:
            if os.path.exists(loc):
                token_file = loc
                with open(loc, "rb") as token:
                    creds = pickle.load(token)
                break

        if not token_file:
            token_file = token_locations[0]

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                with open(token_file, "wb") as token:
                    pickle.dump(creds, token)
            else:
                logger.warning(f"Google {service_name} credentials need authentication")
                return None

        return build(service_name, version, credentials=creds)
    except Exception as e:
        logger.error(f"Google {service_name} service creation error: {e}")
        return None

@mcp.tool()
async def gmail_send(to: str, subject: str, body: str, cc: Optional[str] = None, bcc: Optional[str] = None) -> Dict[str, Any]:
    """Send an email via Gmail."""
    try:
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        import base64

        service = _get_google_service("gmail", "v1", ["https://www.googleapis.com/auth/gmail.send"])
        if not service:
            return {"error": "Gmail service not available. Check Google OAuth credentials.", "success": False}

        message = MIMEMultipart()
        message["to"] = to
        message["subject"] = subject
        if cc:
            message["cc"] = cc
        if bcc:
            message["bcc"] = bcc
        message.attach(MIMEText(body, "html" if "<" in body else "plain"))

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        send_message = service.users().messages().send(userId="me", body={"raw": raw_message}).execute()

        return {"to": to, "subject": subject, "message_id": send_message.get("id"), "thread_id": send_message.get("threadId"), "success": True}
    except Exception as e:
        logger.error(f"Gmail send error: {e}")
        return {"error": str(e), "to": to, "success": False}


@mcp.tool()
async def gmail_list_messages(
    query: Optional[str] = None,
    max_results: int = 10,
    label_ids: Optional[List[str]] = None,
    include_spam_trash: bool = False,
) -> Dict[str, Any]:
    """List Gmail messages. Use query for Gmail search syntax (e.g. 'from:user@example.com', 'is:unread', 'subject:hello')."""
    try:
        service = _get_google_service("gmail", "v1", ["https://www.googleapis.com/auth/gmail.readonly"])
        if not service:
            return {"error": "Gmail service not available. Check Google OAuth credentials.", "success": False}

        params: Dict[str, Any] = {"userId": "me", "maxResults": min(max_results, 500)}
        if query:
            params["q"] = query
        if label_ids:
            params["labelIds"] = label_ids
        if include_spam_trash:
            params["includeSpamTrash"] = True

        result = service.users().messages().list(**params).execute()
        messages = result.get("messages", [])
        next_page_token = result.get("nextPageToken")

        items = []
        for m in messages:
            msg = service.users().messages().get(userId="me", id=m["id"], format="metadata", metadataHeaders=["From", "To", "Subject", "Date"]).execute()
            payload = msg.get("payload", {})
            headers = {h["name"].lower(): h["value"] for h in payload.get("headers", []) if h["name"] in ("From", "To", "Subject", "Date")}
            items.append(
                {
                    "id": msg.get("id"),
                    "thread_id": msg.get("threadId"),
                    "snippet": msg.get("snippet", ""),
                    "from": headers.get("from", ""),
                    "to": headers.get("to", ""),
                    "subject": headers.get("subject", ""),
                    "date": headers.get("date", ""),
                }
            )

        return {"messages": items, "count": len(items), "next_page_token": next_page_token, "success": True}
    except Exception as e:
        logger.error(f"Gmail list messages error: {e}")
        return {"error": str(e), "success": False}


@mcp.tool()
async def gmail_read_message(message_id: str, format: str = "full") -> Dict[str, Any]:
    """Read a single Gmail message by id. format: 'full', 'metadata', 'minimal', or 'raw'."""
    try:
        service = _get_google_service("gmail", "v1", ["https://www.googleapis.com/auth/gmail.readonly"])
        if not service:
            return {"error": "Gmail service not available. Check Google OAuth credentials.", "success": False}

        msg = service.users().messages().get(userId="me", id=message_id, format=format).execute()
        payload = msg.get("payload", {})
        headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}

        body_text = ""
        body_html = ""
        if "parts" in payload:
            for part in payload["parts"]:
                mime = part.get("mimeType", "")
                b = part.get("body", {})
                data = b.get("data")
                if data:
                    import base64

                    decoded = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
                    if "text/html" in mime:
                        body_html = decoded
                    else:
                        body_text = decoded
        else:
            b = payload.get("body", {})
            if b.get("data"):
                import base64

                body_text = base64.urlsafe_b64decode(b["data"]).decode("utf-8", errors="replace")

        return {
            "id": msg.get("id"),
            "thread_id": msg.get("threadId"),
            "snippet": msg.get("snippet", ""),
            "from": headers.get("from", ""),
            "to": headers.get("to", ""),
            "subject": headers.get("subject", ""),
            "date": headers.get("date", ""),
            "body_text": body_text,
            "body_html": body_html if body_html else None,
            "success": True,
        }
    except Exception as e:
        logger.error(f"Gmail read message error: {e}")
        return {"error": str(e), "message_id": message_id, "success": False}

@mcp.tool()
async def calendar_list_events(calendar_id: str = "primary", max_results: int = 10, time_min: Optional[str] = None, time_max: Optional[str] = None) -> Dict[str, Any]:
    """List calendar events from Google Calendar."""
    try:
        from datetime import datetime, timedelta
        
        service = _get_google_service('calendar', 'v3', ['https://www.googleapis.com/auth/calendar.readonly'])
        if not service:
            return {"error": "Calendar service not available. Check Google OAuth credentials.", "success": False}
        
        if not time_min: time_min = datetime.utcnow().isoformat() + 'Z'
        if not time_max: time_max = (datetime.utcnow() + timedelta(days=7)).isoformat() + 'Z'
        
        events_result = service.events().list(calendarId=calendar_id, timeMin=time_min, timeMax=time_max, maxResults=max_results, singleEvents=True, orderBy='startTime').execute()
        events = events_result.get('items', [])
        
        return {
            "calendar_id": calendar_id,
            "events": [{"id": e.get('id'), "summary": e.get('summary'), "start": e.get('start', {}).get('dateTime') or e.get('start', {}).get('date'), "end": e.get('end', {}).get('dateTime') or e.get('end', {}).get('date'), "location": e.get('location')} for e in events],
            "count": len(events), "success": True
        }
    except Exception as e:
        logger.error(f"Calendar list events error: {e}")
        return {"error": str(e), "calendar_id": calendar_id, "success": False}

@mcp.tool()
async def drive_list_files(folder_id: Optional[str] = None, query: Optional[str] = None, max_results: int = 10) -> Dict[str, Any]:
    """List files in Google Drive."""
    try:
        service = _get_google_service('drive', 'v3', ['https://www.googleapis.com/auth/drive.readonly'])
        if not service:
            return {"error": "Drive service not available. Check Google OAuth credentials.", "success": False}
        
        query_parts = []
        if folder_id: query_parts.append(f"'{folder_id}' in parents")
        if query: query_parts.append(query)
        query_string = ' and '.join(query_parts) if query_parts else None
        
        results = service.files().list(q=query_string, pageSize=max_results, fields="files(id, name, mimeType, webViewLink, modifiedTime, size)").execute()
        files = results.get('files', [])
        
        return {
            "files": [{"id": f.get('id'), "name": f.get('name'), "mime_type": f.get('mimeType'), "web_view_link": f.get('webViewLink'), "modified_time": f.get('modifiedTime'), "size": f.get('size')} for f in files],
            "count": len(files), "success": True
        }
    except Exception as e:
        logger.error(f"Drive list files error: {e}")
        return {"error": str(e), "success": False}

@mcp.tool()
async def tasks_list_tasks(tasklist_id: str = "@default", max_results: int = 10, show_completed: bool = False) -> Dict[str, Any]:
    """List tasks in a Google Tasks task list."""
    try:
        service = _get_google_service('tasks', 'v1', ['https://www.googleapis.com/auth/tasks.readonly'])
        if not service:
            return {"error": "Tasks service not available. Check Google OAuth credentials.", "success": False}
        
        results = service.tasks().list(tasklist=tasklist_id, maxResults=max_results, showCompleted=show_completed).execute()
        tasks = results.get('items', [])
        
        return {
            "tasklist_id": tasklist_id,
            "tasks": [{"id": t.get('id'), "title": t.get('title'), "notes": t.get('notes', ''), "status": t.get('status'), "due": t.get('due')} for t in tasks],
            "count": len(tasks), "success": True
        }
    except Exception as e:
        logger.error(f"Tasks list tasks error: {e}")
        return {"error": str(e), "tasklist_id": tasklist_id, "success": False}

@mcp.tool()
async def tasks_create_task(tasklist_id: str = "@default", title: str = "", notes: Optional[str] = None, due: Optional[str] = None) -> Dict[str, Any]:
    """Create a new task in Google Tasks."""
    try:
        service = _get_google_service("tasks", "v1", ["https://www.googleapis.com/auth/tasks"])
        if not service:
            return {"error": "Tasks service not available. Check Google OAuth credentials.", "success": False}

        if not title:
            return {"error": "Task title is required", "success": False}

        task_body = {"title": title}
        if notes:
            task_body["notes"] = notes
        if due:
            task_body["due"] = due

        task = service.tasks().insert(tasklist=tasklist_id, body=task_body).execute()

        return {"tasklist_id": tasklist_id, "task": {"id": task.get("id"), "title": task.get("title"), "status": task.get("status"), "due": task.get("due")}, "success": True}
    except Exception as e:
        logger.error(f"Tasks create task error: {e}")
        return {"error": str(e), "tasklist_id": tasklist_id, "success": False}


# ============================================================================
# GOOGLE SHEETS
# ============================================================================

_SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


@mcp.tool()
async def sheets_create(title: str) -> Dict[str, Any]:
    """Create a new Google Sheet. Returns spreadsheet_id and spreadsheet_url."""
    try:
        service = _get_google_service("sheets", "v4", _SHEETS_SCOPES)
        if not service:
            return {"error": "Sheets service not available. Check Google OAuth credentials.", "success": False}

        spreadsheet = {"properties": {"title": title}}
        result = service.spreadsheets().create(body=spreadsheet).execute()
        return {
            "spreadsheet_id": result.get("spreadsheetId"),
            "spreadsheet_url": result.get("spreadsheetUrl"),
            "title": result.get("properties", {}).get("title"),
            "success": True,
        }
    except Exception as e:
        logger.error(f"Sheets create error: {e}")
        return {"error": str(e), "success": False}


@mcp.tool()
async def sheets_read(spreadsheet_id: str, range: str = "Sheet1!A1:Z1000") -> Dict[str, Any]:
    """Read cell values from a Google Sheet. Use A1 notation (e.g. 'Sheet1!A1:D10' or 'A1:C')."""
    try:
        service = _get_google_service("sheets", "v4", _SHEETS_SCOPES)
        if not service:
            return {"error": "Sheets service not available. Check Google OAuth credentials.", "success": False}

        result = service.spreadsheets().values().get(spreadsheetId=spreadsheet_id, range=range).execute()
        values = result.get("values", [])
        return {"spreadsheet_id": spreadsheet_id, "range": range, "values": values, "success": True}
    except Exception as e:
        logger.error(f"Sheets read error: {e}")
        return {"error": str(e), "spreadsheet_id": spreadsheet_id, "success": False}


@mcp.tool()
async def sheets_edit(
    spreadsheet_id: str,
    range: str,
    values: List[List[Any]],
    value_input_option: str = "USER_ENTERED",
) -> Dict[str, Any]:
    """Update cells in a Google Sheet. values: 2D array of cell values. value_input_option: USER_ENTERED (parse) or RAW (literal)."""
    try:
        service = _get_google_service("sheets", "v4", _SHEETS_SCOPES)
        if not service:
            return {"error": "Sheets service not available. Check Google OAuth credentials.", "success": False}

        body = {"values": values}
        result = service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id, range=range, valueInputOption=value_input_option, body=body
        ).execute()
        return {
            "spreadsheet_id": spreadsheet_id,
            "range": range,
            "updated_cells": result.get("updatedCells", 0),
            "updated_rows": result.get("updatedRows", 0),
            "success": True,
        }
    except Exception as e:
        logger.error(f"Sheets edit error: {e}")
        return {"error": str(e), "spreadsheet_id": spreadsheet_id, "success": False}


@mcp.tool()
async def sheets_append(spreadsheet_id: str, range: str, values: List[List[Any]], value_input_option: str = "USER_ENTERED") -> Dict[str, Any]:
    """Append rows to a Google Sheet. Appends to the end of the range (e.g. 'Sheet1' or 'Sheet1!A:D')."""
    try:
        service = _get_google_service("sheets", "v4", _SHEETS_SCOPES)
        if not service:
            return {"error": "Sheets service not available. Check Google OAuth credentials.", "success": False}

        body = {"values": values}
        result = service.spreadsheets().values().append(
            spreadsheetId=spreadsheet_id, range=range, valueInputOption=value_input_option, insertDataOption="INSERT_ROWS", body=body
        ).execute()
        updates = result.get("updates", {})
        return {"spreadsheet_id": spreadsheet_id, "updated_cells": updates.get("updatedCells", 0), "updated_rows": updates.get("updatedRows", 0), "success": True}
    except Exception as e:
        logger.error(f"Sheets append error: {e}")
        return {"error": str(e), "spreadsheet_id": spreadsheet_id, "success": False}


# ============================================================================
# GOOGLE DOCS
# ============================================================================

_DOCS_SCOPES = ["https://www.googleapis.com/auth/documents"]


@mcp.tool()
async def docs_create(title: str) -> Dict[str, Any]:
    """Create a new Google Doc. Returns document_id and document_url."""
    try:
        service = _get_google_service("docs", "v1", _DOCS_SCOPES)
        if not service:
            return {"error": "Docs service not available. Check Google OAuth credentials.", "success": False}

        doc = service.documents().create(body={"title": title}).execute()
        doc_id = doc.get("documentId")
        return {"document_id": doc_id, "document_url": f"https://docs.google.com/document/d/{doc_id}/edit", "title": title, "success": True}
    except Exception as e:
        logger.error(f"Docs create error: {e}")
        return {"error": str(e), "success": False}


@mcp.tool()
async def docs_read(document_id: str) -> Dict[str, Any]:
    """Read a Google Doc. Returns plain text content and structure."""
    try:
        service = _get_google_service("docs", "v1", _DOCS_SCOPES)
        if not service:
            return {"error": "Docs service not available. Check Google OAuth credentials.", "success": False}

        doc = service.documents().get(documentId=document_id).execute()
        title = doc.get("title", "")
        content_parts = []
        for elem in doc.get("body", {}).get("content", []):
            if "paragraph" in elem:
                for el in elem["paragraph"].get("elements", []):
                    if "textRun" in el:
                        content_parts.append(el["textRun"].get("content", ""))
            if "table" in elem:
                for row in elem["table"].get("tableRows", []):
                    row_text = []
                    for cell in row.get("tableCells", []):
                        for c in cell.get("content", []):
                            if "paragraph" in c:
                                for p in c["paragraph"].get("elements", []):
                                    if "textRun" in p:
                                        row_text.append(p["textRun"].get("content", "").strip())
                        content_parts.append(" | ".join(row_text))
                    content_parts.append("")
        text = "".join(content_parts)
        return {"document_id": document_id, "title": title, "content": text, "success": True}
    except Exception as e:
        logger.error(f"Docs read error: {e}")
        return {"error": str(e), "document_id": document_id, "success": False}


@mcp.tool()
async def docs_edit(document_id: str, requests: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Edit a Google Doc using batchUpdate requests. Each request can be insertText, deleteContent, replaceAllText, etc. See Google Docs API."""
    try:
        service = _get_google_service("docs", "v1", _DOCS_SCOPES)
        if not service:
            return {"error": "Docs service not available. Check Google OAuth credentials.", "success": False}

        result = service.documents().batchUpdate(documentId=document_id, body={"requests": requests}).execute()
        return {"document_id": document_id, "replies": result.get("replies", []), "success": True}
    except Exception as e:
        logger.error(f"Docs edit error: {e}")
        return {"error": str(e), "document_id": document_id, "success": False}


# ============================================================================
# GOOGLE SLIDES
# ============================================================================

_SLIDES_SCOPES = ["https://www.googleapis.com/auth/presentations"]


@mcp.tool()
async def slides_create(title: str) -> Dict[str, Any]:
    """Create a new Google Slides presentation. Returns presentation_id and presentation_url."""
    try:
        service = _get_google_service("slides", "v1", _SLIDES_SCOPES)
        if not service:
            return {"error": "Slides service not available. Check Google OAuth credentials.", "success": False}

        presentation = {"title": title}
        result = service.presentations().create(body=presentation).execute()
        pres_id = result.get("presentationId")
        return {"presentation_id": pres_id, "presentation_url": f"https://docs.google.com/presentation/d/{pres_id}/edit", "title": title, "success": True}
    except Exception as e:
        logger.error(f"Slides create error: {e}")
        return {"error": str(e), "success": False}


@mcp.tool()
async def slides_read(presentation_id: str) -> Dict[str, Any]:
    """Read a Google Slides presentation. Returns slide titles and text content."""
    try:
        service = _get_google_service("slides", "v1", _SLIDES_SCOPES)
        if not service:
            return {"error": "Slides service not available. Check Google OAuth credentials.", "success": False}

        pres = service.presentations().get(presentationId=presentation_id).execute()
        title = pres.get("title", "")
        slides = []
        for slide in pres.get("slides", []):
            slide_text = []
            for obj in slide.get("pageElements", []):
                if "shape" in obj and "text" in obj["shape"]:
                    for te in obj["shape"]["text"].get("textElements", []):
                        if "textRun" in te:
                            slide_text.append(te["textRun"].get("content", ""))
                if "table" in obj:
                    for row in obj["table"].get("tableRows", []):
                        for cell in row.get("tableCells", []):
                            for c in cell.get("content", []):
                                if "paragraph" in c:
                                    for p in c["paragraph"].get("elements", []):
                                        if "textRun" in p:
                                            slide_text.append(p["textRun"].get("content", ""))
            slides.append({"object_id": slide.get("objectId"), "text": "".join(slide_text).strip()})
        return {"presentation_id": presentation_id, "title": title, "slides": slides, "success": True}
    except Exception as e:
        logger.error(f"Slides read error: {e}")
        return {"error": str(e), "presentation_id": presentation_id, "success": False}


@mcp.tool()
async def slides_edit(presentation_id: str, requests: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Edit a Google Slides presentation using batchUpdate requests. Each request can be createSlide, insertText, etc. See Google Slides API."""
    try:
        service = _get_google_service("slides", "v1", _SLIDES_SCOPES)
        if not service:
            return {"error": "Slides service not available. Check Google OAuth credentials.", "success": False}

        result = service.presentations().batchUpdate(presentationId=presentation_id, body={"requests": requests}).execute()
        return {"presentation_id": presentation_id, "replies": result.get("replies", []), "success": True}
    except Exception as e:
        logger.error(f"Slides edit error: {e}")
        return {"error": str(e), "presentation_id": presentation_id, "success": False}


if __name__ == "__main__":
    mcp.run()
