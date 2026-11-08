# System Architecture & Performance Engine

This section details the internal engineering of OpenGeo Cambodia, exploring how in-memory spatial indexing, $O(1)$ hash maps, and edge caching achieve sub-millisecond execution.

## Chapters in this Category
- **[02-architecture-and-performance.md](02-architecture-and-performance.md)**: Under the Hood — Architecture & Sub-Millisecond In-Memory Indexing

## Key Concepts
- **In-Memory Store**: All 16,472 administrative units pre-indexed into RAM at startup.
- **Two-Tier Spatial Index**: $O(1)$ 2D bounding box pre-filtering followed by ray-casting intersection.
- **Dual Runtime**: Cloudflare Workers Edge (300+ PoPs) and standalone Node.js daemon.

[← Previous: Getting Started](../getting-started/01-introduction-and-domain-model.md) | [Next: Administrative Hierarchy API →](../administrative/03-administrative-hierarchy-api.md)
