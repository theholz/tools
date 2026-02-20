# Service Onboarding Checklist

**Version:** 2.0.0  
**Last Updated:** 2026-01-11

## Overview

This checklist provides a comprehensive guide for onboarding new services to the agentic platform. Follow this checklist to ensure all requirements are met.

**IMPORTANT:** All services use `docker compose` (NOT docker-compose or podman)

## Pre-Onboarding

### 1. Service Definition

- [ ] **Service Name**: Define clear, descriptive name
- [ ] **Service Purpose**: Document what the service does
- [ ] **Service Type**: Identify type (web, worker, database, MCP, etc.)
- [ ] **Dependencies**: List all dependencies (services, databases, APIs)
- [ ] **Data Requirements**: Identify data storage needs

### 2. Technical Requirements

- [ ] **Language/Framework**: Specify language and framework
- [ ] **Port Requirements**: Define internal ports (no external publishing)
- [ ] **Resource Requirements**: Specify CPU, memory, storage needs
- [ ] **Health Check**: Define health check endpoint
- [ ] **Metrics**: Define metrics to expose

### 3. Security Requirements

- [ ] **Authentication**: Define authentication method
- [ ] **Authorization**: Define authorization requirements
- [ ] **Encryption**: Define encryption requirements (at rest, in transit)
- [ ] **Secrets**: List required secrets and API keys
- [ ] **Compliance**: Identify compliance requirements

### 4. MCP Integration (if applicable)

- [ ] **MCP Server**: Determine if service should be MCP server
- [ ] **Transport Type**: Choose transport (stdio, SSE)
- [ ] **Tools**: Define MCP tools to expose
- [ ] **Resources**: Define MCP resources to expose
- [ ] **Prompts**: Define MCP prompts (if applicable)

## Onboarding Steps

### Phase 1: ARCHITECT

#### 1.1 Feasibility Analysis

- [ ] **Technical Feasibility**: Assess technical feasibility
- [ ] **Alternative Solutions**: Evaluate alternative solutions
- [ ] **Risk Assessment**: Identify and assess risks
- [ ] **Resource Availability**: Verify resources are available
- [ ] **Timeline Estimate**: Estimate implementation timeline

#### 1.2 Create Epic

- [ ] **Epic Document**: Create epic document
- [ ] **Acceptance Criteria**: Define acceptance criteria
- [ ] **Success Metrics**: Define success metrics
- [ ] **Dependencies**: Document dependencies
- [ ] **Timeline**: Create implementation timeline

#### 1.3 Update Memory Bank

- [ ] **Update activeContext.md**: Log current focus
- [ ] **Update progress.md**: Log planning progress
- [ ] **Confidence Score**: Record confidence score
- [ ] **Rationale**: Document rationale
- [ ] **Risks**: Document identified risks

### Phase 2: PLAN

#### 2.1 Dependency Analysis

- [ ] **Query Dependencies**: Identify dependent services
- [ ] **Impact Analysis**: Analyze impact on existing services
- [ ] **Dependency Mapping**: Map all dependencies
- [ ] **Update Memory Bank**: Document dependencies

#### 2.2 Implementation Plan

- [ ] **Task Breakdown**: Break down into tasks
- [ ] **Update tasks.md**: Create user stories
- [ ] **Task Order**: Define task order and dependencies
- [ ] **Resource Allocation**: Allocate resources

#### 2.3 Documentation Plan

- [ ] **Documentation List**: List all documentation to create
- [ ] **Diagram Types**: Specify diagram types needed
- [ ] **Folder Structure**: Define folder structure
- [ ] **Templates**: Select appropriate templates

### Phase 3: QA VALIDATION

#### 3.1 Dependency Verification

- [ ] **Packages Installed**: Verify all required packages installed
- [ ] **Version Compatibility**: Verify version compatibility
- [ ] **Install Missing**: Install missing packages if needed

#### 3.2 Configuration Validation

- [ ] **docker-compose.yml Valid**: Validate Docker Compose syntax
- [ ] **Platform Compatible**: Verify platform compatibility
- [ ] **Settings Present**: Verify all required settings present

#### 3.3 Environment Validation

- [ ] **Docker Available**: Verify Docker is available
- [ ] **Permissions Sufficient**: Verify permissions sufficient
- [ ] **Ports Available**: Verify ports not in use

#### 3.4 Build Test

- [ ] **Build Image**: Build container image
- [ ] **Start Service**: Start service with `docker compose up`
- [ ] **Health Check**: Verify health check passes
- [ ] **Log Results**: Log QA validation results

### Phase 4: ACT

#### 4.1 Search Existing Solutions

- [ ] **Search Memory Bank**: Search for existing solutions
- [ ] **Evaluate Found**: Evaluate found solutions
- [ ] **Reuse or Adapt**: Reuse or adapt if found
- [ ] **Justify New**: Justify creating new if not found

#### 4.2 Tool Selection

- [ ] **n8n Workflow**: Check if n8n workflow can solve
- [ ] **MCP Tools**: Check if MCP tools available
- [ ] **Cursor MCP**: Check if Cursor MCP can solve
- [ ] **Custom Code**: Use custom code only if above not applicable
- [ ] **Justify Choice**: Justify tool choice

#### 4.3 Implementation

- [ ] **Follow Templates**: Follow system patterns and templates
- [ ] **Write Code**: Write implementation code
- [ ] **Write Tests**: Write unit and integration tests
- [ ] **Update Progress**: Update progress in Memory Bank

#### 4.4 Pre-Commit Validation

- [ ] **Linting Pass**: Verify linting passes
- [ ] **Tests Pass**: Verify all tests pass
- [ ] **Documentation Complete**: Verify documentation complete
- [ ] **Docker Compose Valid**: Verify docker-compose.yml valid

### Phase 5: REVIEW

#### 5.1 Verify Acceptance Criteria

- [ ] **AC Testable**: Verify each AC is testable
- [ ] **AC Measurable**: Verify each AC is measurable
- [ ] **AC Verified**: Verify each AC is verified
- [ ] **Log Verification**: Log verification results

#### 5.2 Check Tests and Quality

- [ ] **Tests Pass**: Verify all tests pass
- [ ] **No Regressions**: Verify no regressions
- [ ] **Code Review**: Complete code review checklist

#### 5.3 Verify Documentation

- [ ] **Documentation Complete**: Verify documentation complete
- [ ] **Correct Templates**: Verify from correct templates
- [ ] **Links Work**: Verify all links work
- [ ] **Diagrams Render**: Verify diagrams render
- [ ] **Updated Navigation**: Verify navigation updated

#### 5.4 Request User Approval

- [ ] **Documentation Complete**: Verify documentation complete
- [ ] **Tests Pass**: Verify all tests pass
- [ ] **AC Verified**: Verify all AC verified
- [ ] **User Approval**: Wait for user approval

## Post-Onboarding

### 1. Deployment

- [ ] **Added to docker-compose.yml**: Service defined in compose file
- [ ] **Container Started**: `docker compose up -d service-name`
- [ ] **Health Check**: Verify health check passes
- [ ] **Logs Clean**: Verify logs are clean

### 2. Monitoring

- [ ] **Metrics Exposed**: Verify metrics exposed
- [ ] **Prometheus Configured**: Configure Prometheus scraping
- [ ] **Grafana Dashboard**: Create Grafana dashboard (if applicable)
- [ ] **Alerts Configured**: Configure alerts (if applicable)

### 3. Documentation

- [ ] **Service Overview**: Create service overview document
- [ ] **API Reference**: Create API reference (if applicable)
- [ ] **Configuration**: Create configuration document
- [ ] **Troubleshooting**: Create troubleshooting document

### 4. Memory Bank Update

- [ ] **Update progress.md**: Mark service as complete
- [ ] **Update activeContext.md**: Update current focus
- [ ] **Update techContext.md**: Add service to tech stack

### 5. Backup Strategy

- [ ] **Backup Schedule**: Define backup schedule
- [ ] **Backup Script**: Create backup script
- [ ] **Restore Tested**: Test restore procedure
- [ ] **Backup Monitoring**: Configure backup monitoring

## MCP Service Onboarding (Additional)

### 1. MCP Server Setup

- [ ] **Server Implementation**: Implement MCP server
- [ ] **Tools Registered**: Register all tools
- [ ] **Resources Registered**: Register all resources
- [ ] **Prompts Registered**: Register all prompts (if applicable)

### 2. MCP Configuration

- [ ] **Stdio Config**: Configure stdio transport (if applicable)
- [ ] **SSE Config**: Configure SSE transport (if applicable)
- [ ] **Test Connection**: Test MCP connection

### 3. MCP Documentation

- [ ] **Tools Documented**: Document all MCP tools
- [ ] **Resources Documented**: Document all MCP resources
- [ ] **Usage Examples**: Provide usage examples
- [ ] **Integration Guide**: Create integration guide

## Service Categories

### Web Services

**Characteristics:**
- HTTP/HTTPS endpoints
- User-facing UI
- API endpoints

**Additional Requirements:**
- Reverse proxy configuration (Caddy/Traefik)
- SSL/TLS certificates
- Authentication (if needed)
- Rate limiting

### Worker Services

**Characteristics:**
- Background processing
- Queue-based
- No direct user access

**Additional Requirements:**
- Queue configuration (Redis, RabbitMQ)
- Worker scaling
- Job monitoring
- Error handling

### Database Services

**Characteristics:**
- Data storage
- Query interface
- Backup requirements

**Additional Requirements:**
- Backup strategy
- Replication (if needed)
- Connection pooling
- Performance tuning

### MCP Services

**Characteristics:**
- MCP protocol implementation
- Tool/resource exposure
- Stdio or SSE transport

**Additional Requirements:**
- MCP server implementation
- Tool documentation
- Resource documentation

## Docker Compose Service Template

```yaml
services:
  my-service:
    build:
      context: ./services/my-service
      dockerfile: Dockerfile
    container_name: ${PROJECT_NAME}-my-service
    restart: unless-stopped
    
    environment:
      - NODE_ENV=${ENVIRONMENT:-development}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    
    volumes:
      - ${DATA_ROOT}/my-service:/data
      - ${LOGS_ROOT}/my-service:/logs
    
    networks:
      - internal
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    depends_on:
      database:
        condition: service_healthy
```

## Common Pitfalls

### 1. Using Wrong Docker Command

**Problem:** Using `docker-compose` or `podman`

**Solution:** Always use `docker compose` (with space)

### 2. Skipping Memory Bank Updates

**Problem:** Not updating Memory Bank after changes

**Solution:** Always update activeContext.md and progress.md

### 3. Ignoring Health Checks

**Problem:** Not implementing health check endpoint

**Solution:** Always implement health check endpoint

### 4. Forgetting Documentation

**Problem:** Not creating documentation

**Solution:** Create documentation as part of implementation

### 5. Skipping Tests

**Problem:** Not writing tests

**Solution:** Write tests as part of implementation

### 6. Poor Volume Management

**Problem:** Not organizing volumes properly

**Solution:** Follow volume management strategy with ${DATA_ROOT}

## Validation Checklist

### Before Deployment

- [ ] All phases completed (ARCHITECT → PLAN → QA → ACT → REVIEW)
- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Memory Bank updated
- [ ] User approval received

### After Deployment

- [ ] Service running (`docker compose ps`)
- [ ] Health check passing
- [ ] Metrics exposed
- [ ] Monitoring configured
- [ ] Backup strategy in place

## References

- [Phase Definitions](../../methodology/phases.md)
- [Biswas Patterns](../../methodology/biswas-patterns.md)
- [Doctrine Principles](../../methodology/doctrine-principles.md)
- [Docker Compose Template](../../config/docker/compose-template.md)
- [Volume Management](../../docs/volume-management.md)

---

**Last Updated:** 2026-01-11  
**Version:** 2.0.0
