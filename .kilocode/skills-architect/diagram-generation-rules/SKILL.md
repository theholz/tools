---
name: diagram-generation-rules
description: 'Cursor rule: diagram-generation-rules. Use when following project rules for this topic.'
source: cursor-rules
metadata:
  origin: "/home/tait/Projects/localai/framework/rules/DIAGRAM_GENERATION_RULES.mdc"
---

# Diagram Generation Rules

## Overview

This document defines how to generate system diagrams, architecture diagrams, workflow diagrams, and other visual documentation using Mermaid and PlantUML formats.

## Diagram Types

### 1. System Architecture Diagram

**Purpose:** Show all services, relationships, and external systems

**Required Elements:**
- All services in the system
- Service relationships (dependencies)
- External systems (APIs, databases)
- Data flow direction
- Service grouping (if applicable)

**Mermaid Template:**
```mermaid
graph TB
    subgraph "External"
        User["User/Browser"]
        API["External API"]
    end
    
    subgraph "Platform Services"
        Caddy["Caddy Reverse Proxy"]
        N8N["n8n Workflow"]
        Letta["Letta Agent"]
    end
    
    subgraph "Data Layer"
        Neo4j["Neo4j Graph DB"]
        Postgres["PostgreSQL"]
        Redis["Redis Cache"]
    end
    
    User -->|HTTP| Caddy
    Caddy -->|Forward| N8N
    Caddy -->|Forward| Letta
    N8N -->|Query| Neo4j
    N8N -->|Query| Postgres
    Letta -->|Query| Neo4j
    Letta -->|Cache| Redis
    N8N -->|API Call| API
    
    style Caddy fill:#FF6B6B
    style N8N fill:#4ECDC4
    style Letta fill:#45B7D1
    style Neo4j fill:#96CEB4
    style Postgres fill:#FFEAA7
    style Redis fill:#DDA15E
```

**Generation Checklist:**
- [ ] All services included
- [ ] Relationships clearly shown
- [ ] External systems identified
- [ ] Color coding for service types
- [ ] Direction arrows for data flow
- [ ] Grouping for logical organization

### 2. Service Dependency Diagram

**Purpose:** Show service dependencies and failure cascade

**Required Elements:**
- Service A depends on Service B
- Data flow between services
- Failure cascade visualization
- Dependency direction

**Mermaid Template:**
```mermaid
graph LR
    A["Service A"] -->|Depends On| B["Service B"]
    A -->|Depends On| C["Service C"]
    B -->|Depends On| D["Service D"]
    C -->|Depends On| D
    D -->|Depends On| E["Service E"]
    
    style A fill:#FF6B6B
    style B fill:#4ECDC4
    style C fill:#45B7D1
    style D fill:#96CEB4
    style E fill:#FFEAA7
```

**Generation Checklist:**
- [ ] All dependencies shown
- [ ] Direction of dependency clear
- [ ] Failure cascade visible
- [ ] Critical path highlighted

### 3. Data Flow Diagram

**Purpose:** Show how data moves through the system

**Required Elements:**
- Data entry points
- Processing steps
- Storage locations
- Output destinations
- Data transformation points

**Mermaid Template:**
```mermaid
flowchart LR
    Input["Data Input"] -->|Raw Data| Process1["Process 1<br/>Transform"]
    Process1 -->|Processed Data| Store1["Storage 1<br/>Temporary"]
    Store1 -->|Retrieve| Process2["Process 2<br/>Analyze"]
    Process2 -->|Results| Store2["Storage 2<br/>Permanent"]
    Store2 -->|Query| Output["Data Output"]
    
    style Input fill:#FF6B6B
    style Process1 fill:#4ECDC4
    style Process2 fill:#45B7D1
    style Store1 fill:#96CEB4
    style Store2 fill:#FFEAA7
    style Output fill:#DDA15E
```

**Generation Checklist:**
- [ ] Entry points identified
- [ ] Processing steps shown
- [ ] Storage locations marked
- [ ] Output destinations clear
- [ ] Data transformation visible

### 4. Database Schema Diagram

**Purpose:** Show database tables, relationships, and key fields

**Required Elements:**
- All tables
- Relationships (foreign keys)
- Key fields (primary keys)
- Indexes (if important)
- Data types (if needed)

**PlantUML Template:**
```plantuml
@startuml
entity "users" {
  * id : INT <<PK>>
  --
  * email : VARCHAR
  * name : VARCHAR
  created_at : TIMESTAMP
}

entity "workflows" {
  * id : INT <<PK>>
  --
  * user_id : INT <<FK>>
  * name : VARCHAR
  * status : VARCHAR
  created_at : TIMESTAMP
}

users ||--o{ workflows : "has many"

@enduml
```

**Mermaid Alternative (if PlantUML not available):**
```mermaid
erDiagram
    USERS ||--o{ WORKFLOWS : "has many"
    USERS {
        int id PK
        string email
        string name
        timestamp created_at
    }
    WORKFLOWS {
        int id PK
        int user_id FK
        string name
        string status
        timestamp created_at
    }
```

**Generation Checklist:**
- [ ] All tables included
- [ ] Relationships shown
- [ ] Primary keys marked
- [ ] Foreign keys identified
- [ ] Important indexes noted

### 5. Workflow Diagram

**Purpose:** Show decision points, process steps, and conditional paths

**Required Elements:**
- Decision points
- Process steps
- Conditional paths
- Start/end points
- Error handling paths

**Mermaid Template:**
```mermaid
flowchart TD
    Start([Start]) --> Check{Check Condition}
    Check -->|Yes| Process1[Process Step 1]
    Check -->|No| Process2[Process Step 2]
    Process1 --> Decision{Decision Point}
    Process2 --> Decision
    Decision -->|Path A| End1([End Success])
    Decision -->|Path B| End2([End Error])
    
    style Start fill:#96CEB4
    style End1 fill:#96CEB4
    style End2 fill:#FF6B6B
    style Check fill:#FFEAA7
    style Decision fill:#FFEAA7
```

**Generation Checklist:**
- [ ] Start/end points clear
- [ ] Decision points identified
- [ ] Process steps shown
- [ ] Conditional paths labeled
- [ ] Error paths included

### 6. API Architecture Diagram

**Purpose:** Show API endpoints, service connections, and authentication flow

**Required Elements:**
- API endpoints
- Service connections
- Authentication flow
- Request/response flow

**Mermaid Template:**
```mermaid
sequenceDiagram
    participant Client
    participant API Gateway
    participant Auth Service
    participant Service A
    participant Service B
    
    Client->>API Gateway: Request
    API Gateway->>Auth Service: Validate Token
    Auth Service-->>API Gateway: Token Valid
    API Gateway->>Service A: Forward Request
    Service A->>Service B: Internal Call
    Service B-->>Service A: Response
    Service A-->>API Gateway: Response
    API Gateway-->>Client: Response
```

**Generation Checklist:**
- [ ] All endpoints shown
- [ ] Service connections clear
- [ ] Authentication flow visible
- [ ] Request/response flow shown
- [ ] Error paths included

## Diagram Generation Process

### Step 1: Identify Diagram Type
```python
# Determine diagram type based on need
if need == "system_overview":
    diagram_type = "System Architecture Diagram"
elif need == "dependencies":
    diagram_type = "Service Dependency Diagram"
elif need == "data_flow":
    diagram_type = "Data Flow Diagram"
# ... etc
```

### Step 2: Gather Information
- Services/components involved
- Relationships between components
- Data flow direction
- Dependencies
- External systems

### Step 3: Create Diagram
- Use appropriate template
- Fill with gathered information
- Apply color coding
- Add labels and descriptions

### Step 4: Validate Diagram
- [ ] All components included
- [ ] Relationships accurate
- [ ] Direction arrows correct
- [ ] Color coding consistent
- [ ] Diagram renders correctly

### Step 5: Integrate with Documentation
- [ ] Add diagram to appropriate doc
- [ ] Add caption explaining diagram
- [ ] Add alt text for accessibility
- [ ] Update diagram list in overview

## Diagram Location Rules

**System Architecture Diagrams:**
- Location: `docs/architecture/system-diagram.md`
- Or: `docs/architecture/diagrams/system-architecture.mmd`

**Service-Specific Diagrams:**
- Location: `docs/services/[service]/diagrams.md`
- Or: `docs/services/[service]/diagrams/[diagram-name].mmd`

**Workflow Diagrams:**
- Location: `docs/workflows/[workflow-name]-diagram.md`
- Or: Embedded in workflow documentation

**Data Flow Diagrams:**
- Location: `docs/architecture/data-flow.md`
- Or: `docs/architecture/diagrams/data-flow.mmd`

## Mermaid Format Guidelines

**Graph Types:**
- `graph TB` - Top to bottom
- `graph LR` - Left to right
- `flowchart TD` - Flowchart top to bottom
- `sequenceDiagram` - Sequence diagram
- `erDiagram` - Entity relationship

**Styling:**
```mermaid
style NodeName fill:#COLOR,stroke:#COLOR,color:#COLOR
```

**Common Colors:**
- Services: `#4ECDC4` (teal)
- Databases: `#FFEAA7` (yellow)
- External: `#FF6B6B` (red)
- Processing: `#45B7D1` (blue)
- Storage: `#96CEB4` (green)

## Diagram Maintenance

**When to Update Diagrams:**
- When services are added/removed
- When dependencies change
- When data flow changes
- When architecture changes
- On scheduled review date

**Diagram Review Checklist:**
- [ ] All current services included
- [ ] Relationships still accurate
- [ ] Dependencies up to date
- [ ] Data flow correct
- [ ] External systems current
- [ ] Color coding consistent
- [ ] Diagram renders correctly

## Integration with Documentation

**Every Diagram Must Include:**
1. **Caption:** Brief description of what the diagram shows
2. **Alt Text:** For accessibility
3. **Context:** Where it fits in the documentation
4. **Related Docs:** Links to related documentation

**Example:**
```markdown
## System Architecture

The following diagram shows the complete system architecture:

```mermaid
[diagram code]
```

**Figure 1:** System Architecture Diagram - Shows all services, their relationships, and external systems.

*Related Documentation:*
- [Service Dependencies](service-dependencies.md)
- [Data Flow](data-flow.md)
```
