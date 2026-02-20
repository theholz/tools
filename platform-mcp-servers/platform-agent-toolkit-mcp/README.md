# Platform Agent Toolkit MCP

MCP server for Letta agent memory and Google Workspace: Gmail, Calendar, Drive, Tasks, Sheets, Docs, Slides.

## 🛠️ Included Tools

### Letta Client
*   **`get_letta_memory`** - Retrieve memory from Letta agent (core, archival, reflection)
*   **`add_to_letta_memory`** - Add content to Letta agent memory

### Gmail
*   **`gmail_send`** - Send email
*   **`gmail_list_messages`** - List/search messages (Gmail query syntax)
*   **`gmail_read_message`** - Read a message by id

### Google Calendar
*   **`calendar_list_events`** - List calendar events

### Google Drive
*   **`drive_list_files`** - List files in Drive

### Google Tasks
*   **`tasks_list_tasks`** - List tasks
*   **`tasks_create_task`** - Create task

### Google Sheets
*   **`sheets_create`** - Create a new spreadsheet
*   **`sheets_read`** - Read cell values (A1 notation)
*   **`sheets_edit`** - Update cells
*   **`sheets_append`** - Append rows

### Google Docs
*   **`docs_create`** - Create a new document
*   **`docs_read`** - Read document content (plain text)
*   **`docs_edit`** - Edit document (batchUpdate requests)

### Google Slides
*   **`slides_create`** - Create a new presentation
*   **`slides_read`** - Read slide content
*   **`slides_edit`** - Edit presentation (batchUpdate requests)

## 🔑 Configuration

### Letta
```bash
LETTA_URL=http://letta:8283
LETTA_API_KEY=your_key_here
```

### Google Workspace (OAuth)
Google tools require OAuth tokens. Set:
```bash
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
```

Token files (pickle) must be at `/tmp/google_tokens/` or `/tmp/`, e.g.:
*   `google_token.pickle` – single token with all scopes
*   `google_gmail_token.pickle`, `google_sheets_token.pickle`, etc.

## 🏗️ Architecture

Uses `fastmcp` with:
- **Letta API:** Agent memory (core, archival, reflection)
- **Google API client:** Gmail, Calendar, Drive, Tasks, Sheets, Docs, Slides

