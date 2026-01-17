# AI Instructions Structure

This folder contains instructions for collaborating with Claude (GitHub Copilot) on the all-things-book-club project.

## Files

### `MASTER.md`
The master template containing core collaboration principles:
- Uncertainty & question-asking
- Clarification requests
- Transparent explanations
- Offering options
- Back-and-forth workflow
- Planning, scaffolding, and testing approaches
- Code quality standards

This file is the foundational instruction set that applies to all work.

### `all-things-book-club.md`
Project-specific configurations and conventions:
- Technology stack details
- Code style and naming conventions
- File organization patterns
- Testing framework and approach
- Development workflow preferences
- Project-specific patterns as they emerge

This file is customized for this project and referenced alongside `MASTER.md`.

## How to Use

When starting work, address Claude as **"HAL"** at the beginning of your prompt. This activates both instruction files:

1. **HAL** - Use all guidance from both MASTER.md and the project-specific file
2. **Specific file reference** - You can also reference individual files explicitly

Example prompts:
```
HAL, I need help planning the user authentication system.
```

```
HAL, help me scaffold the API endpoints for books.
```

## Updating Instructions

- **MASTER.md**: Update when you want changes to core collaboration principles
- **project-specific file**: Update as you establish coding patterns, preferences, and constraints specific to this project

Share feedback and preferences with Claude to keep instructions aligned with your working style.
