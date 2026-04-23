---
name: n8n-node-creation
description: "Quick index for n8n custom node creation docs. USE FOR: finding the right page across overview, planning, build, test, and deploy stages. TRIGGERS: 'n8n creating nodes', 'plan node type', 'declarative vs programmatic', 'node file structure', 'node linter', 'deploy community node'. DO NOT USE FOR: copying full docs content; provide concise pointers only."
---

# n8n Node Creation Docs Index

Use this skill to route work to the correct n8n documentation page quickly.

## When To Use

- You need a fast map of the n8n node-creation lifecycle.
- You want links with short descriptions instead of long doc extracts.
- You are deciding what to read next while building a community or private node.

## Lifecycle Index

### 1) Overview

- [Creating nodes](https://docs.n8n.io/integrations/creating-nodes/overview/): Entry point for the full lifecycle and prerequisites.

### 2) Plan

- [Plan a node](https://docs.n8n.io/integrations/creating-nodes/plan/): Design decisions before implementation.
- [Choose a node type](https://docs.n8n.io/integrations/creating-nodes/plan/node-types/): Pick the right node category and behavior model.
- [Choose a node building style](https://docs.n8n.io/integrations/creating-nodes/plan/choose-node-method/): Decide between declarative and programmatic approaches.
- [Node UI design](https://docs.n8n.io/integrations/creating-nodes/plan/node-ui-design/): UX and parameter design guidance.

### 3) Build

- [Build your node](https://docs.n8n.io/integrations/creating-nodes/build/): Build-phase hub with tutorials and references.
- [Set up your development environment](https://docs.n8n.io/integrations/creating-nodes/build/node-development-environment/): Local tooling and workspace setup.
- [Using the n8n-node tool](https://docs.n8n.io/integrations/creating-nodes/build/n8n-node/): Scaffold and helper CLI for node development.
- [Tutorial: Build a declarative-style node](https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/): Walkthrough for config-driven nodes.
- [Tutorial: Build a programmatic-style node](https://docs.n8n.io/integrations/creating-nodes/build/programmatic-style-node/): Walkthrough for code-first nodes.

#### Build Reference

- [Reference hub](https://docs.n8n.io/integrations/creating-nodes/build/reference/): Central reference for implementation details.
- [Node UI elements](https://docs.n8n.io/integrations/creating-nodes/build/reference/ui-elements/): Available UI controls and patterns.
- [Code standards](https://docs.n8n.io/integrations/creating-nodes/build/reference/code-standards/): Style and maintainability expectations.
- [Error handling](https://docs.n8n.io/integrations/creating-nodes/build/reference/error-handling/): Recommended error patterns and messaging.
- [Versioning](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-versioning/): Safe upgrades and backward compatibility.
- [Node file structure](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-file-structure/): Folder and file layout for node packages.
- [Node base files](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-base-files/): Core node definition files.
- [Codex files](https://docs.n8n.io/integrations/creating-nodes/build/reference/node-codex-files/): Metadata files used for discoverability and docs.
- [Credentials files](https://docs.n8n.io/integrations/creating-nodes/build/reference/credentials-files/): Credential type definitions and auth wiring.
- [HTTP request helpers](https://docs.n8n.io/integrations/creating-nodes/build/reference/http-helpers/): Helpers for robust API calls.
- [Item linking (paired items)](https://docs.n8n.io/integrations/creating-nodes/build/reference/paired-items/): Preserve item lineage through execution.
- [UX guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/ux-guidelines/): Consistency and usability expectations.
- [Verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/): Requirements for verified node submission quality.

### 4) Test

- [Test your node](https://docs.n8n.io/integrations/creating-nodes/test/): Testing workflow for local validation.
- [Run your node locally](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/): Execute and inspect behavior in development.
- [Node linter](https://docs.n8n.io/integrations/creating-nodes/test/node-linter/): Detect quality and compatibility issues early.
- [Troubleshooting node development](https://docs.n8n.io/integrations/creating-nodes/test/troubleshooting-node-development/): Common failure modes and fixes.

### 5) Deploy

- [Deploy your node](https://docs.n8n.io/integrations/creating-nodes/deploy/): Distribution and release options.
- [Submit community nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/): Publish and optionally seek verification.
- [Install private nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/install-private-nodes/): Internal/private distribution path.

## Suggested Reading Path

1. Overview
2. Plan (type, style, UI)
3. Build (tutorial + reference)
4. Test (local run + linter)
5. Deploy (community or private)
