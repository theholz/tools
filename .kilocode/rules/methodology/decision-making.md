# Decision Making Framework

**Version:** 1.0.0  
**Last Updated:** 2026-01-06

## Overview

This framework provides a structured approach to decision-making that blends logic, learning, and planning frameworks with uncertainty expression and confidence tracking.

## Decision Process

### Step 1: Gather Context

**Load Product Context:**
- Vision and goals
- Constraints and non-negotiables
- Success criteria
- Risk tolerance

**Load Task Context:**
- Current phase
- Active blockers
- Available resources
- Dependencies

**Load Historical Context:**
- Past decisions and outcomes
- Performance metrics
- Calibration data
- Learning patterns

### Step 2: Apply Logic Framework

**Check Hard Constraints:**
- Position limits
- Risk limits
- Compliance rules
- Technical constraints

**Validate Against Rules:**
- Guardrails
- OPA policies
- Security requirements
- Performance requirements

**Result:**
```json
{
  "logic_result": {
    "valid": true,
    "violations": [],
    "constraints_checked": ["position", "risk", "compliance"]
  }
}
```

### Step 3: Apply Learning Framework

**Gather Soft Heuristics:**
- Analyst ratings
- Momentum indicators
- Historical patterns
- Market sentiment

**Assess Historical Performance:**
- Similar past decisions
- Success rates
- Risk profiles
- Outcomes

**Result:**
```json
{
  "learning_result": {
    "score": 0.75,
    "factors": [
      "Strong analyst ratings",
      "Positive momentum",
      "Historical success rate: 65%"
    ],
    "confidence": 0.70
  }
}
```

### Step 4: Apply Planning Framework

**Plan Execution Steps:**
- Sequential task execution
- Dependency management
- Resource allocation
- Timeline planning

**Assess Feasibility:**
- Resource availability
- Time constraints
- Technical feasibility
- Risk assessment

**Result:**
```json
{
  "planning_result": {
    "feasible": true,
    "steps": [
      "Step 1: Prepare environment",
      "Step 2: Execute task",
      "Step 3: Verify results"
    ],
    "estimated_duration": "2 hours",
    "confidence": 0.85
  }
}
```

### Step 5: Blend Results

**Calculate Weights:**
```python
def calculate_weights(logic_conf, learning_conf, planning_conf):
    """Calculate framework weights based on context."""
    
    # High risk context
    if context['risk_level'] == 'high':
        return {
            'logic': 0.60,
            'learning': 0.20,
            'planning': 0.20
        }
    
    # Normal context
    elif context['risk_level'] == 'normal':
        return {
            'logic': 0.40,
            'learning': 0.30,
            'planning': 0.30
        }
    
    # Low risk context
    else:
        return {
            'logic': 0.20,
            'learning': 0.40,
            'planning': 0.40
        }
```

**Calculate Blended Score:**
```python
def blend_results(logic, learning, planning, weights):
    """Blend results from all frameworks."""
    
    blended_score = (
        weights['logic'] * logic['score'] +
        weights['learning'] * learning['score'] +
        weights['planning'] * planning['score']
    )
    
    return {
        'blended_score': blended_score,
        'weights': weights,
        'framework_results': {
            'logic': logic,
            'learning': learning,
            'planning': planning
        }
    }
```

### Step 6: Express Uncertainty

**Calculate Confidence:**
```python
def calculate_confidence(reasoning, risks, blended_score):
    """Calculate confidence score."""
    
    # Base confidence from blended score
    confidence = blended_score
    
    # Reduce confidence based on risks
    risk_penalty = len(risks) * 0.10
    confidence -= risk_penalty
    
    # Increase confidence based on reasoning strength
    reasoning_bonus = len(reasoning) * 0.05
    confidence += reasoning_bonus
    
    # Clamp to [0, 1]
    confidence = max(0.0, min(1.0, confidence))
    
    return confidence
```

**Express Uncertainty:**
```json
{
  "decision": "APPROVE",
  "confidence": 0.82,
  "reasoning": [
    "Logic framework: All constraints satisfied",
    "Learning framework: Strong historical performance",
    "Planning framework: Feasible execution plan"
  ],
  "risks": [
    "Market volatility",
    "Technical complexity"
  ],
  "blended_score": 0.85,
  "weights": {
    "logic": 0.40,
    "learning": 0.30,
    "planning": 0.30
  }
}
```

### Step 7: Make Decision

**Decision Rules:**

| Confidence | Action | Example |
|------------|--------|---------|
| 0.90 - 1.00 | Auto-approve | Well-tested, low-risk changes |
| 0.75 - 0.89 | Auto-approve (with review) | Standard changes |
| 0.60 - 0.74 | Pending (human review) | Moderate risk |
| < 0.60 | Escalate to human | High risk, uncertain |

**Implementation:**
```python
def make_decision(blended_result, confidence):
    """Make final decision based on confidence."""
    
    # Very high confidence
    if confidence >= 0.90:
        return {
            'action': 'AUTO_APPROVE',
            'confidence': confidence,
            'reason': 'Very high confidence'
        }
    
    # High confidence
    elif confidence >= 0.75:
        return {
            'action': 'AUTO_APPROVE_WITH_REVIEW',
            'confidence': confidence,
            'reason': 'High confidence, review recommended'
        }
    
    # Moderate confidence
    elif confidence >= 0.60:
        return {
            'action': 'PENDING_HUMAN_REVIEW',
            'confidence': confidence,
            'reason': 'Moderate confidence, requires human review'
        }
    
    # Low confidence
    else:
        return {
            'action': 'ESCALATE_TO_HUMAN',
            'confidence': confidence,
            'reason': 'Low confidence, requires human decision'
        }
```

### Step 8: Log Decision

**Log to Memory Bank:**
```python
def log_decision(decision, context):
    """Log decision to Memory Bank."""
    
    log_decision(
        workspace_id=context['workspace_id'],
        summary=decision['action'],
        rationale="; ".join(decision['reasoning']),
        confidence=decision['confidence'],
        implementation_details=json.dumps({
            "reasoning_factors": decision['reasoning'],
            "risks": decision['risks'],
            "blended_score": decision['blended_score'],
            "weights": decision['weights'],
            "calibration_status": "pending"
        }),
        tags=['decision_made', context['phase']]
    )
```

**Track Calibration:**
```python
def track_calibration(decision_id, predicted_confidence, actual_outcome):
    """Track calibration of confidence predictions."""
    
    # Calculate calibration error
    calibration_error = abs(predicted_confidence - actual_outcome)
    
    # Store for analysis
    store_calibration_data({
        'decision_id': decision_id,
        'predicted_confidence': predicted_confidence,
        'actual_outcome': actual_outcome,
        'calibration_error': calibration_error,
        'timestamp': datetime.now()
    })
    
    # Alert if error is large
    if calibration_error > 0.20:
        alert(f"Large calibration error: {calibration_error:.2f}")
```

---

## Decision Templates

### Template 1: Service Creation

```json
{
  "decision_type": "service_creation",
  "service_name": "my-service",
  "logic_result": {
    "valid": true,
    "violations": [],
    "constraints_checked": ["security", "performance", "compliance"]
  },
  "learning_result": {
    "score": 0.80,
    "factors": [
      "Similar services successful",
      "Proven technology stack",
      "Clear requirements"
    ],
    "confidence": 0.75
  },
  "planning_result": {
    "feasible": true,
    "steps": [
      "Create pod configuration",
      "Build container image",
      "Deploy to pod",
      "Verify functionality"
    ],
    "estimated_duration": "4 hours",
    "confidence": 0.85
  },
  "blended_result": {
    "blended_score": 0.80,
    "weights": {
      "logic": 0.40,
      "learning": 0.30,
      "planning": 0.30
    }
  },
  "decision": {
    "action": "AUTO_APPROVE",
    "confidence": 0.80,
    "reasoning": [
      "Logic: All constraints satisfied",
      "Learning: Similar services successful",
      "Planning: Feasible execution plan"
    ],
    "risks": [
      "Integration complexity",
      "Performance unknown"
    ]
  }
}
```

### Template 2: Feature Implementation

```json
{
  "decision_type": "feature_implementation",
  "feature_name": "user-authentication",
  "logic_result": {
    "valid": true,
    "violations": [],
    "constraints_checked": ["security", "compliance"]
  },
  "learning_result": {
    "score": 0.70,
    "factors": [
      "Standard authentication pattern",
      "Well-documented",
      "Low risk"
    ],
    "confidence": 0.70
  },
  "planning_result": {
    "feasible": true,
    "steps": [
      "Design authentication flow",
      "Implement authentication logic",
      "Add tests",
      "Update documentation"
    ],
    "estimated_duration": "8 hours",
    "confidence": 0.80
  },
  "blended_result": {
    "blended_score": 0.73,
    "weights": {
      "logic": 0.40,
      "learning": 0.30,
      "planning": 0.30
    }
  },
  "decision": {
    "action": "AUTO_APPROVE_WITH_REVIEW",
    "confidence": 0.73,
    "reasoning": [
      "Logic: Security constraints satisfied",
      "Learning: Standard pattern",
      "Planning: Feasible implementation"
    ],
    "risks": [
      "Security vulnerabilities",
      "User experience impact"
    ]
  }
}
```

### Template 3: Risky Change

```json
{
  "decision_type": "risky_change",
  "change_description": "database-migration",
  "logic_result": {
    "valid": true,
    "violations": [],
    "constraints_checked": ["data_integrity", "availability"]
  },
  "learning_result": {
    "score": 0.50,
    "factors": [
      "Complex migration",
      "Limited historical data",
      "High risk of data loss"
    ],
    "confidence": 0.50
  },
  "planning_result": {
    "feasible": true,
    "steps": [
      "Backup database",
      "Test migration on staging",
      "Execute migration",
      "Verify data integrity",
      "Rollback if needed"
    ],
    "estimated_duration": "24 hours",
    "confidence": 0.60
  },
  "blended_result": {
    "blended_score": 0.53,
    "weights": {
      "logic": 0.60,
      "learning": 0.20,
      "planning": 0.20
    }
  },
  "decision": {
    "action": "PENDING_HUMAN_REVIEW",
    "confidence": 0.53,
    "reasoning": [
      "Logic: Data integrity constraints satisfied",
      "Learning: Limited historical data",
      "Planning: Feasible but complex"
    ],
    "risks": [
      "Data loss",
      "Downtime",
      "Rollback complexity"
    ]
  }
}
```

---

## Decision Quality Metrics

### Metrics to Track

**1. Calibration Accuracy**
- Predicted confidence vs actual outcome
- Target: Calibration error < 10%

**2. Decision Speed**
- Time to make decision
- Target: < 5 minutes for routine decisions

**3. Decision Consistency**
- Similar decisions have similar outcomes
- Target: Consistency score > 0.80

**4. Risk Assessment**
- Accuracy of risk identification
- Target: Risk identification rate > 90%

**5. Framework Usage**
- How often each framework is used
- Target: Balanced usage across frameworks

### Metric Calculation

```python
def calculate_metrics(decisions):
    """Calculate decision quality metrics."""
    
    # Calibration accuracy
    calibration_errors = [
        abs(d['predicted_confidence'] - d['actual_outcome'])
        for d in decisions
    ]
    calibration_accuracy = 1.0 - np.mean(calibration_errors)
    
    # Decision speed
    decision_times = [d['decision_time'] for d in decisions]
    avg_decision_time = np.mean(decision_times)
    
    # Decision consistency
    consistency_score = calculate_consistency(decisions)
    
    # Risk assessment
    risk_identification_rate = calculate_risk_identification(decisions)
    
    # Framework usage
    framework_usage = calculate_framework_usage(decisions)
    
    return {
        'calibration_accuracy': calibration_accuracy,
        'avg_decision_time': avg_decision_time,
        'consistency_score': consistency_score,
        'risk_identification_rate': risk_identification_rate,
        'framework_usage': framework_usage
    }
```

---

## Decision Improvement

### Continuous Improvement

**Daily:**
- Review decisions made
- Track outcomes
- Update confidence model

**Weekly:**
- Analyze calibration errors
- Identify systematic biases
- Adjust framework weights

**Monthly:**
- Deep audit of decisions
- Update decision logic
- Improve risk assessment

### Learning from Outcomes

```python
def learn_from_outcome(decision, outcome):
    """Learn from decision outcome."""
    
    # Calculate calibration error
    calibration_error = abs(decision['confidence'] - outcome)
    
    # Update confidence model
    update_confidence_model(
        decision['context'],
        decision['confidence'],
        outcome,
        calibration_error
    )
    
    # Identify patterns
    if calibration_error > 0.20:
        analyze_large_error(decision, outcome)
    
    # Update framework weights
    if calibration_error > 0.10:
        adjust_framework_weights(decision['context'])
```

---

## Best Practices

### Always
- Apply all three frameworks
- Express uncertainty with confidence
- Log all decisions with context
- Track calibration over time
- Learn from outcomes

### Never
- Skip framework application
- Override guardrails
- Ignore low confidence
- Forget to log
- Assume without verification

### When in Doubt
- Use conservative approach
- Escalate to human
- Log uncertainty
- Request clarification

---

## References

- [Phase Definitions](phases.md)
- [Biswas Patterns](biswas-patterns.md)
- [Doctrine Principles](doctrine-principles.md)