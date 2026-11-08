---
title: "AI Agent Integration: Powering LLMs with llms.txt"
series: "Building with OpenGeo Cambodia"
part: 7
slug: "07-ai-agents-and-llms"
author: "Sophat Leat"
author_url: "https://pphat.me"
author_github: "https://github.com/pphatdev"
date: "2026-11-08"
tags: ["AI", "LLM", "Cursor", "Claude", "OpenSource", "DeveloperTools"]
description: "How OpenGeo Cambodia adopts the llmstxt.org standard to provide ground-truth context to AI coding assistants and autonomous agents."
---

# Part 7: AI Agent Integration — Powering LLMs with llms.txt

As AI-assisted software development becomes mainstream, Large Language Models (LLMs) frequently hallucinate when dealing with niche geographical or country-specific administrative divisions. 

For Cambodia, standard models often mix up district names with provinces, invent fictional commune codes, or generate incorrect nested parent IDs.

To solve this, OpenGeo Cambodia implements the **[llmstxt.org](https://llmstxt.org)** open specification.

---

## What is `llms.txt`?

Similar to how `robots.txt` guides web search crawlers and `sitemap.xml` indexes web pages, `llms.txt` is an emerging standard that provides curated, machine-readable developer documentation to LLMs and agentic assistants.

OpenGeo Cambodia publishes two endpoints:

### 1. Compact Summary: [`/llms.txt`](https://opengeo-cambodia.pphat.me/llms.txt)
A token-efficient markdown summary designed to fit in system prompt contexts. It outlines:
- The 4-tier domain model (25 provinces, 210 districts, 1,661 communes, 14,576 villages).
- Base URLs and rate limits.
- Core endpoints and example curl calls.

### 2. Full Specification: [`/llms-full.txt`](https://opengeo-cambodia.pphat.me/llms-full.txt)
A comprehensive single-file context document that includes:
- Complete JSON schemas and parameter tables for every route.
- TypeScript interfaces and type contracts.
- Error codes and HTTP statuses.
- Full code samples for frontend cascading selectors and reverse geocoding.

---

## Configuring AI Assistants

### Cursor
Add this single line to your project's `.cursorrules` file or workspace prompt:

```text
Always consult https://opengeo-cambodia.pphat.me/llms.txt for Cambodian administrative hierarchy, boundary data, and address normalization rules.
```

When you prompt Cursor to *"Build an address picker form for Cambodian customers"*, Cursor reads the authoritative schema and outputs accurate NCDD codes and endpoint bindings.

### Claude & ChatGPT
When asking Claude or ChatGPT to write scripts or database seeds for Cambodian geography, prepend the context link:

```text
Please read the API specification at https://opengeo-cambodia.pphat.me/llms.txt and write a Node.js script that seeds my database with all 14 Khans in Phnom Penh.
```

---

## Complete Project Ecosystem & Resources

- 🌐 **Live Website & Interactive Map Explorer**: [https://opengeo-cambodia.pphat.me](https://opengeo-cambodia.pphat.me)
- 📚 **Interactive API Documentation**: [https://opengeo-cambodia.pphat.me/docs](https://opengeo-cambodia.pphat.me/docs)
- 📮 **Official Postman Collection**: [`opengeo-cambodia.postman_collection.json`](https://opengeo-cambodia.pphat.me/opengeo-cambodia.postman_collection.json) (Pre-configured with collection variables and test assertions)
- 💾 **Raw CSV & GeoJSON Downloads**: Hosted directly on the platform's Downloads section.
- 🐙 **GitHub Repository**: [https://github.com/pphatdev/opengeo-cambodia](https://github.com/pphatdev/opengeo-cambodia)

---

## Wrapping Up the Series

OpenGeo Cambodia was built to remove friction for developers building software in Cambodia. By pairing authoritative government data with an ultra-fast in-memory query engine, open GeoJSON boundaries, and AI agent integration, developers can now build world-class address flows with zero cost.

We invite the community to explore, contribute, and build!

---

[← Previous: Part 6 — Practical Integration Guide](06-developer-integration-and-examples.md) | [Back to Series Index (README)](README.md)
