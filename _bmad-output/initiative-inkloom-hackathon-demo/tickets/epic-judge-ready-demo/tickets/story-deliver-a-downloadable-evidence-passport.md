---
id: 3
type: story
title: "Deliver a downloadable Evidence Passport"
parent: epic-judge-ready-demo
covers: [R4]
after: [1]
refined: true
hitl: false
risk: high
---

# Deliver a downloadable Evidence Passport

## Description

Generate a portable evidence artifact from the approval result and provide a working download action.

## Requirements

1. **Passport generation**
   **Given** the campaign review is complete and approved
   **When** the judge requests the Evidence Passport
   **Then** a downloadable artifact is generated in the browser

2. **Passport contents**
   **Given** the passport is downloaded
   **When** the judge opens it
   **Then** it contains the campaign summary, findings, evidence references, corrections, and approval decision

**Verify:** After approval, download the passport and confirm it contains the campaign summary, findings, evidence, and decision.

## References

- parent — _bmad-output/initiative-inkloom-hackathon-demo/tickets/epic-judge-ready-demo/epic-judge-ready-demo.md
