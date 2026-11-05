---
id: 1
type: story
title: "Complete the no-login campaign tracing path"
parent: epic-judge-ready-demo
covers: [R1, R3, R4]
after: []
refined: true
hitl: false
risk: high
---

# Complete the no-login campaign tracing path

## Description

Wire one seeded campaign from public input through findings, evidence, approval, and passport preview so a judge can see the complete workflow.

## Requirements

1. **Public tracer path**
   **Given** a judge opens the deployed dashboard without an account
   **When** the judge runs the seeded campaign analysis
   **Then** findings and the reviewed campaign are visible without navigation setup
   **And** the judge can open evidence and approve the review

2. **Passport preview**
   **Given** the review is approved
   **When** the judge opens the Evidence Passport area
   **Then** the approval outcome, campaign, findings, and evidence summary are visible

**Verify:** From the public dashboard, run the sample analysis, open evidence, approve the review, and view the generated passport.

## References

- parent — _bmad-output/initiative-inkloom-hackathon-demo/tickets/epic-judge-ready-demo/epic-judge-ready-demo.md
