# Biswas Framework Patterns

**Version:** 1.0.0  
**Last Updated:** 2026-01-06

## Overview

The Biswas Framework provides 8 patterns for building reliable, observable, and trustworthy agentic systems. These patterns are integrated into each development phase.

## Pattern 1: Reflection

### When to Use
- Daily rebalancing (low time pressure)
- Feasibility analysis (ARCHITECT phase)
- Quality improvement tasks

### When to Skip
- Intraday execution (high time pressure)
- Emergency responses
- Real-time operations

### Process

```
Generate → Evaluate → [Refine if quality < 0.75] → Return
```

### Implementation

```python
def reflection_pattern(task, max_iterations=3):
    """
    Apply reflection pattern to improve output quality.
    
    Args:
        task: The task to perform
        max_iterations: Maximum refinement iterations (default: 3)
    
    Returns:
        Improved result with quality score
    """
    for iteration in range(max_iterations):
        # Generate initial result
        result = generate_result(task)
        
        # Evaluate quality
        quality = evaluate_quality(result)
        
        # If quality is sufficient, return
        if quality >= 0.75:
            log_decision(
                summary=f"Reflection complete after {iteration + 1} iterations",
                rationale=f"Quality score {quality:.2f} meets threshold",
                confidence=quality
            )
            return result
        
        # Otherwise, refine
        result = refine_result(result, quality_feedback)
    
    # Max iterations reached
    log_warning(
        f"Reflection reached max {max_iterations} iterations with quality {quality:.2f}"
    )
    return result
```

### Quality Evaluation Criteria

- **Risk Assessment**: Are risks identified and mitigated?
- **Alternatives**: Were alternatives considered?
- **Constraints**: Are all constraints satisfied?
- **Completeness**: Is the solution complete?
- **Clarity**: Is the solution clear and understandable?

### Logging

Always log reflection decisions to Memory Bank:
- Number of iterations
- Quality scores
- Refinement reasons
- Final confidence

---

## Pattern 2: Tool Use

### When to Use
- Every tool invocation
- API calls
- External service interactions

### Process

```
Schema → Validation → Error Handling → Fallback → Log
```

### Implementation

```python
def tool_use_pattern(tool_name, tool_input, schema, fallback=None):
    """
    Apply tool use pattern with validation and error handling.
    
    Args:
        tool_name: Name of the tool
        tool_input: Input to the tool
        schema: Expected schema for input/output
        fallback: Fallback function if tool fails
    
    Returns:
        Tool output or fallback result
    """
    start_time = time.time()
    
    try:
        # Validate input against schema
        validate_schema(tool_input, schema['input'])
        
        # Call tool
        output = call_tool(tool_name, tool_input)
        
        # Validate output against schema
        validate_schema(output, schema['output'])
        
        # Log success
        duration = time.time() - start_time
        log_tool_call(
            tool_name=tool_name,
            input=tool_input,
            output=output,
            duration=duration,
            status='success'
        )
        
        return output
    
    except Exception as e:
        # Log error
        duration = time.time() - start_time
        log_tool_call(
            tool_name=tool_name,
            input=tool_input,
            error=str(e),
            duration=duration,
            status='error'
        )
        
        # Use fallback if available
        if fallback:
            log_info(f"Using fallback for {tool_name}")
            return fallback(tool_input)
        
        # Otherwise, re-raise
        raise
```

### Schema Validation

Define schemas for all tools:
```python
tool_schemas = {
    'http_request': {
        'input': {
            'url': str,
            'method': str,  # GET, POST, PUT, DELETE
            'headers': dict,
            'body': dict
        },
        'output': {
            'status_code': int,
            'headers': dict,
            'body': dict
        }
    }
}
```

### Fallback Strategies

1. **Cached Data**: Use previously cached results
2. **Alternative Tool**: Use different tool for same purpose
3. **Default Value**: Use sensible default
4. **Graceful Degradation**: Reduce functionality

### Logging Requirements

Log every tool call with:
- Tool name
- Input (sanitized)
- Output (sanitized)
- Duration
- Status (success/error)
- Error details (if applicable)

---

## Pattern 3: Planning

### When to Use
- Complex goal decomposition
- Task scheduling
- Dependency management

### Process

```
Decompose → Validate Dependencies → Handle Failures → Execute
```

### Implementation

```python
def planning_pattern(goal, max_depth=3):
    """
    Apply planning pattern to decompose complex goals.
    
    Args:
        goal: High-level goal to achieve
        max_depth: Maximum decomposition depth
    
    Returns:
        Execution plan with dependencies
    """
    # Decompose goal into subtasks
    plan = decompose_goal(goal, max_depth)
    
    # Validate dependencies
    for task in plan:
        dependencies = get_dependencies(task)
        if not validate_dependencies(dependencies):
            log_error(f"Invalid dependencies for task {task}")
            raise PlanningError(f"Cannot validate dependencies for {task}")
    
    # Handle failures gracefully
    plan_with_fallbacks = add_fallbacks(plan)
    
    # Log plan
    log_plan(plan_with_fallbacks)
    
    return plan_with_fallbacks
```

### Dependency Validation

Check:
- All dependencies exist
- No circular dependencies
- Dependencies are in correct order
- Resources are available

### Failure Handling

For each task:
1. Identify potential failure modes
2. Define fallback strategies
3. Set retry limits
4. Define escalation paths

### Example Plan

```json
{
  "goal": "Deploy new service",
  "tasks": [
    {
      "id": "task-1",
      "name": "Build container image",
      "dependencies": [],
      "fallback": "use_cached_image",
      "retry_limit": 3
    },
    {
      "id": "task-2",
      "name": "Deploy to pod",
      "dependencies": ["task-1"],
      "fallback": "rollback_to_previous",
      "retry_limit": 2
    }
  ]
}
```

---

## Pattern 4: Multi-Agent (CWD) Orchestration

### When to Use
- Complex multi-step workflows
- Parallel task execution
- Specialized agent coordination

### Architecture

```
┌─────────────────────────────────────────┐
│         Coordinator Agent             │
│  - Orchestrates goal                 │
│  - Decomposes into phases            │
│  - Assigns to workers               │
│  - Monitors progress                │
│  - Aggregates results               │
└──────────────┬──────────────────────┘
               │
               ├──→ Research Agent (ARCHITECT)
               ├──→ Planning Agent (PLAN)
               ├──→ Implementation Agent (ACT)
               └──→ Review Agent (REVIEW)
```

### Implementation

```python
class CoordinatorAgent:
    """Orchestrates multi-agent workflow."""
    
    def __init__(self):
        self.workers = {
            'research': ResearchAgent(),
            'planning': PlanningAgent(),
            'implementation': ImplementationAgent(),
            'review': ReviewAgent()
        }
        self.message_queue = MessageQueue()
    
    def orchestrate(self, goal):
        """Orchestrate goal through all phases."""
        # Decompose goal
        phases = self.decompose_goal(goal)
        
        # Assign tasks to workers
        results = {}
        for phase, task in phases.items():
            worker = self.workers[phase]
            self.message_queue.send_task(worker, task)
        
        # Monitor progress
        for phase, task in phases.items():
            worker = self.workers[phase]
            result = self.message_queue.receive_result(worker, timeout=300)
            results[phase] = result
        
        # Aggregate results
        final_result = self.aggregate_results(results)
        
        # Make decision
        decision = self.make_decision(final_result)
        
        return decision
```

### Message Queue

Features:
- Async communication
- Durable task storage
- Timeout handling (5 minutes per task)
- Failure recovery

### Worker Agents

**Research Agent (ARCHITECT Phase):**
- Feasibility analysis
- Technical assessment
- Alternative evaluation

**Planning Agent (PLAN Phase):**
- CMDB queries
- Dependency mapping
- Task decomposition

**Implementation Agent (ACT Phase):**
- Code implementation
- Tool selection
- Error handling

**Review Agent (REVIEW Phase):**
- Verification
- Approval
- Retrospective

---

## Pattern 5: Metacognition

### When to Use
- Every decision
- Uncertainty assessment
- Confidence calibration

### Process

```
Assess Confidence → Express Uncertainty → Escalate if Low → Track Calibration
```

### Implementation

```python
def metacognition_pattern(decision, confidence, reasoning, risks):
    """
    Apply metacognition pattern to decision-making.
    
    Args:
        decision: The decision being made
        confidence: Confidence score (0-1)
        reasoning: List of reasoning factors
        risks: List of identified risks
    
    Returns:
        Decision with confidence metadata
    """
    # Express uncertainty
    if confidence < 0.60:
        log_warning(f"Low confidence ({confidence:.2f}) for decision: {decision}")
        escalate_to_human(
            decision=decision,
            confidence=confidence,
            reasoning=reasoning,
            risks=risks
        )
        return None
    
    # Log decision with confidence
    log_decision(
        summary=decision,
        rationale="; ".join(reasoning),
        confidence=confidence,
        implementation_details=json.dumps({
            "reasoning_factors": reasoning,
            "risks": risks,
            "calibration_status": "pending"
        })
    )
    
    # Track calibration
    track_calibration(decision, confidence)
    
    return decision
```

### Confidence Scoring

| Confidence Range | Action | Example |
|------------------|--------|---------|
| 0.90 - 1.00 | Auto-approve | Well-tested, low-risk changes |
| 0.75 - 0.89 | Auto-approve (with review) | Standard changes |
| 0.60 - 0.74 | Pending (human review) | Moderate risk |
| < 0.60 | Escalate to human | High risk, uncertain |

### Calibration Tracking

Track:
- Predicted confidence vs actual outcome
- Calibration error
- Systematic biases
- Adjustment factors

---

## Pattern 6: Memory

### When to Use
- Storing and retrieving information
- Learning from past decisions
- Maintaining context

### Memory Types

**Working Memory:**
- Current trades
- Active decisions
- Temporary state
- Duration: Session

**Long-term Memory:**
- Strategy performance metrics
- Historical patterns
- Learned rules
- Duration: Permanent

**Episodic Memory:**
- Complete trade history
- Decision outcomes
- Event sequences
- Duration: Permanent

### Implementation

```python
class MemorySystem:
    """Multi-tier memory system."""
    
    def __init__(self):
        self.working = WorkingMemory()
        self.long_term = LongTermMemory()
        self.episodic = EpisodicMemory()
    
    def store(self, key, value, memory_type='working'):
        """Store value in specified memory."""
        if memory_type == 'working':
            self.working.store(key, value)
        elif memory_type == 'long_term':
            self.long_term.store(key, value)
        elif memory_type == 'episodic':
            self.episodic.store(key, value)
    
    def retrieve(self, key, memory_type='working'):
        """Retrieve value from specified memory."""
        if memory_type == 'working':
            return self.working.retrieve(key)
        elif memory_type == 'long_term':
            return self.long_term.retrieve(key)
        elif memory_type == 'episodic':
            return self.episodic.retrieve(key)
    
    def search(self, query, memory_type='all'):
        """Search across memory types."""
        results = []
        if memory_type in ['working', 'all']:
            results.extend(self.working.search(query))
        if memory_type in ['long_term', 'all']:
            results.extend(self.long_term.search(query))
        if memory_type in ['episodic', 'all']:
            results.extend(self.episodic.search(query))
        return results
```

### Memory Management

- **Working Memory**: Clear at session end
- **Long-term Memory**: Periodic cleanup of obsolete data
- **Episodic Memory**: Never delete (audit trail)

---

## Pattern 7: Trust = Transparency

### When to Use
- Every decision
- Every action
- Every failure

### Process

```
Explain Decision → Show Data Sources → Track Record → Monitor
```

### Implementation

```python
def trust_pattern(decision, data_sources, reasoning, track_record):
    """
    Apply trust pattern to decision-making.
    
    Args:
        decision: The decision being made
        data_sources: List of data sources used
        reasoning: Decision reasoning
        track_record: Historical performance metrics
    
    Returns:
        Decision with transparency metadata
    """
    # Explain decision
    explanation = {
        'decision': decision,
        'data_sources': data_sources,
        'reasoning': reasoning,
        'confidence': calculate_confidence(data_sources, reasoning),
        'track_record': track_record
    }
    
    # Log explanation
    log_transparency(explanation)
    
    # Monitor for deviations
    if track_record['sharpe'] < 0.80:
        alert("Sharpe ratio below threshold")
    
    if track_record['win_rate'] < 0.50:
        alert("Win rate below threshold")
    
    return decision
```

### Transparency Requirements

For every decision, provide:
1. **What was decided**
2. **Why it was decided**
3. **What data sources were used**
4. **What are the risks**
5. **What is the confidence level**

### Track Record Metrics

- **Sharpe Ratio**: Risk-adjusted returns (target: > 0.80)
- **Win Rate**: Percentage of successful decisions (target: > 50%)
- **Max Drawdown**: Largest loss from peak (target: < 10%)
- **Volatility**: Standard deviation of returns (target: < 15%)

### Real-time Monitoring

Alert on:
- Deviations from expected performance
- Unusual patterns
- Risk threshold breaches
- Confidence drops

---

## Pattern 8: Safety as Architecture

### When to Use
- Every system design
- Every implementation
- Every deployment

### Process

```
Define Guardrails → Implement Fallbacks → Monitor → Audit
```

### Implementation

```python
class SafetySystem:
    """Safety system with guardrails and fallbacks."""
    
    def __init__(self):
        self.guardrails = self.load_guardrails()
        self.fallbacks = self.load_fallbacks()
        self.monitor = MonitoringSystem()
    
    def check_guardrails(self, action):
        """Check if action violates any guardrails."""
        for guardrail in self.guardrails:
            if guardrail['condition'](action):
                log_violation(guardrail['name'], action)
                return False
        return True
    
    def execute_with_safety(self, action):
        """Execute action with safety checks."""
        # Check guardrails
        if not self.check_guardrails(action):
            return self.fallbacks['guardrail_violation'](action)
        
        try:
            # Execute action
            result = execute(action)
            
            # Monitor result
            self.monitor.check(result)
            
            return result
        
        except Exception as e:
            # Use fallback
            log_error(f"Action failed: {e}")
            return self.fallbacks['execution_failure'](action, e)
```

### Guardrails (Hard Limits)

Cannot override:
- Position size: $100K max
- Leverage: 1.3x max
- Sector concentration: 40% max
- Compliance: Zero violations
- Risk limits: Daily loss limit

### Fallbacks

1. **Guardrail Violation**: Reject action, alert user
2. **Execution Failure**: Retry with alternative, then escalate
3. **Data Unavailable**: Use cached data, then escalate
4. **Timeout**: Abort, log, escalate

### Monitoring

Real-time alerts on:
- Guardrail violations
- Fallback activations
- Unusual patterns
- Performance degradation

### Auditing

Daily/weekly/monthly audits:
- Review all guardrail violations
- Analyze fallback usage
- Check calibration
- Update guardrails as needed

---

## Pattern Integration

### Phase Mapping

| Phase | Patterns Used |
|--------|---------------|
| ARCHITECT | Reflection, Planning, Metacognition |
| PLAN | Planning, Metacognition, Memory |
| QA | Tool Use, Safety |
| ACT | Tool Use, Metacognition, Safety |
| REVIEW | Metacognition, Trust, Memory |

### Pattern Combinations

**Reflection + Metacognition:**
- Generate solution
- Evaluate quality
- Assess confidence
- Refine if needed

**Tool Use + Safety:**
- Validate input
- Execute tool
- Check guardrails
- Use fallback if needed

**Planning + Memory:**
- Decompose goal
- Check past solutions
- Reuse if applicable
- Plan new if not

---

## Best Practices

### Always
- Apply patterns consistently
- Log all pattern applications
- Track pattern effectiveness
- Update patterns based on feedback

### Never
- Skip patterns for convenience
- Override guardrails
- Ignore low confidence
- Forget to log

### When in Doubt
- Use conservative approach
- Escalate to human
- Log uncertainty
- Request clarification

---

## References

- [Phase Definitions](phases.md)
- [Doctrine Principles](doctrine-principles.md)
- [Decision Making](decision-making.md)