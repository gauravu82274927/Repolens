# RepoLens

> Understand a GitHub codebase before you open it.

RepoLens is an AI-powered developer tool that analyzes public GitHub repositories and generates a structured overview of the codebase.

Instead of manually opening dozens of files to understand an unfamiliar project, RepoLens identifies the repository's technology stack, architecture, entry point, important files, and practical improvement opportunities.

## Live Demo

https://repolens-delta-six.vercel.app

## GitHub Repository

https://github.com/gauravu82274927/Repolens

---

## What RepoLens Does

Give RepoLens a public GitHub repository URL and it analyzes the codebase to provide:

- Project summary
- Technology stack
- Architecture overview
- Application entry point
- Important files with explanations
- Practical improvement suggestions
- Repository metadata and statistics

The goal is to make the first few minutes of exploring an unfamiliar codebase much faster.

---

## How It Works

```text
GitHub Repository URL
        |
        v
   RepoLens Frontend
        |
        v
    Node.js API
        |
        +------------------+
        |                  |
        v                  v
   GitHub API          Repository
                         Analysis
        |                  |
        +--------+---------+
                 |
                 v
           Gemini AI
                 |
                 v
        Structured Analysis
                 |
                 v
          RepoLens UI
