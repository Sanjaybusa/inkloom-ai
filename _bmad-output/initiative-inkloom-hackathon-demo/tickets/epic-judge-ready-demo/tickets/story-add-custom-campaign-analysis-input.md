---
id: 2
type: story
title: "Add custom campaign analysis input"
parent: epic-judge-ready-demo
covers: [R2]
after: [1]
refined: true
hitl: false
risk: medium
---

# Add custom campaign analysis input

## Description

Let judges replace seeded campaign copy with their own campaign text and run the governance analysis.

## Requirements

1. **Custom campaign entry**
   **Given** a judge opens the campaign workspace
   **When** the judge replaces the sample copy with campaign text and runs analysis
   **Then** the submitted copy appears in the review context
   **And** the analysis state visibly updates without account setup

2. **Invalid input handling**
   **Given** the campaign input is empty
   **When** the judge starts analysis
   **Then** the product prompts for campaign content and does not claim a completed analysis

**Verify:** Enter custom text, run analysis, and see the submitted text represented in the workspace findings.

## References

- parent — _bmad-output/initiative-inkloom-hackathon-demo/tickets/epic-judge-ready-demo/epic-judge-ready-demo.md
