---
title: "Practical Integration Guide: TypeScript, Python & Leaflet"
series: "Building with OpenGeo Cambodia"
part: 6
slug: "06-developer-integration-and-examples"
author: "Sophat Leat"
author_url: "https://pphat.me"
author_github: "https://github.com/pphatdev"
date: "2026-11-08"
tags: ["TypeScript", "Python", "GeoPandas", "Leaflet", "Tutorial", "Frontend"]
description: "Step-by-step code implementations for cascading address dropdowns, spatial data science with GeoPandas, and Leaflet map rendering."
---

# Part 6: Practical Integration Guide — TypeScript, Python & Leaflet

In this guide, we provide ready-to-use code snippets demonstrating how to integrate OpenGeo Cambodia across different platforms and programming languages.

---

## 1. Frontend Cascading Address Selector (Vanilla TypeScript / JS)

Here is a lightweight, zero-dependency pattern for cascading address dropdowns:

```typescript
const API = "https://opengeo-cambodia.pphat.me/api/admin";

interface AdminItem {
  id: number;
  code: string;
  name_en: string;
  name_km: string;
}

class AddressPicker {
  private provinceSelect = document.getElementById("province") as HTMLSelectElement;
  private districtSelect = document.getElementById("district") as HTMLSelectElement;
  private communeSelect = document.getElementById("commune") as HTMLSelectElement;
  private villageSelect = document.getElementById("village") as HTMLSelectElement;

  constructor() {
    this.init();
  }

  async init() {
    this.provinceSelect.addEventListener("change", () => this.loadDistricts());
    this.districtSelect.addEventListener("change", () => this.loadCommunes());
    this.communeSelect.addEventListener("change", () => this.loadVillages());

    await this.loadProvinces();
  }

  private populate(select: HTMLSelectElement, items: AdminItem[], placeholder: string) {
    select.innerHTML = `<option value="">-- ${placeholder} --</option>`;
    select.disabled = items.length === 0;
    
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = String(item.id);
      opt.textContent = `${item.name_km} (${item.name_en})`;
      select.appendChild(opt);
    }
  }

  async loadProvinces() {
    const res = await fetch(`${API}/provinces`);
    const { data } = await res.json();
    this.populate(this.provinceSelect, data, "Select Province / Capital");
  }

  async loadDistricts() {
    const provId = this.provinceSelect.value;
    this.populate(this.districtSelect, [], "Loading...");
    this.populate(this.communeSelect, [], "Select District first");
    this.populate(this.villageSelect, [], "Select Commune first");
    if (!provId) return;

    const res = await fetch(`${API}/provinces/${provId}/districts`);
    const { data } = await res.json();
    this.populate(this.districtSelect, data, "Select District / Khan");
  }

  async loadCommunes() {
    const distId = this.districtSelect.value;
    this.populate(this.communeSelect, [], "Loading...");
    this.populate(this.villageSelect, [], "Select Commune first");
    if (!distId) return;

    const res = await fetch(`${API}/districts/${distId}/communes`);
    const { data } = await res.json();
    this.populate(this.communeSelect, data, "Select Commune / Sangkat");
  }

  async loadVillages() {
    const commId = this.communeSelect.value;
    this.populate(this.villageSelect, [], "Loading...");
    if (!commId) return;

    const res = await fetch(`${API}/communes/${commId}/villages`);
    const { data } = await res.json();
    this.populate(this.villageSelect, data, "Select Village / Phum");
  }
}
```

---

## 2. Spatial Data Science with Python & GeoPandas

Because OpenGeo Cambodia serves standards-compliant GeoJSON, you can load boundaries directly into a GeoPandas GeoDataFrame with a single line:

```python
import requests
import geopandas as gpd
import matplotlib.pyplot as plt

# 1. Fetch Cambodia's 25 province boundary polygons
url = "https://opengeo-cambodia.pphat.me/api/boundaries/provinces"
response = requests.get(url)
data = response.json()

# 2. Parse GeoJSON FeatureCollection into a GeoDataFrame
gdf = gpd.GeoDataFrame.from_features(data["features"])

print(f"Successfully loaded {len(gdf)} provinces.")
print(gdf[["code", "name_en", "name_km"]].head())

# 3. Create a choropleth plot
fig, ax = plt.subplots(figsize=(10, 8))
gdf.plot(
    ax=ax,
    color="#e6f7f5",
    edgecolor="#0d9488",
    linewidth=1.2
)

# Annotate centroids
for idx, row in gdf.iterrows():
    centroid = row.geometry.centroid
    ax.annotate(
        text=row["name_en"],
        xy=(centroid.x, centroid.y),
        horizontalalignment='center',
        fontsize=7,
        color="#090d16"
    )

ax.set_title("Cambodia Administrative Boundaries (25 Provinces)", fontsize=14, pad=12)
ax.axis("off")
plt.tight_layout()
plt.savefig("cambodia_provinces.png", dpi=300)
print("Saved map visualization to cambodia_provinces.png")
```

---

## 3. Interactive Leaflet Map with Boundary Highlighting

Render interactive vector maps using Leaflet.js with hover effects and popups:

```javascript
import L from "leaflet";

// Initialize Leaflet map centered over Cambodia
const map = L.map("map").setView([12.5657, 104.991], 7);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Fetch all 25 province polygons
fetch("https://opengeo-cambodia.pphat.me/api/boundaries/provinces")
  .then((res) => res.json())
  .then((geojson) => {
    L.geoJSON(geojson, {
      style: {
        color: "#0d9488",
        weight: 1.5,
        fillColor: "#0284c7",
        fillOpacity: 0.12
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        
        // Tooltip on hover
        layer.bindTooltip(
          `<strong>${props.name_en}</strong> (${props.name_km})`,
          { sticky: true }
        );

        // Highlight on hover
        layer.on("mouseover", () => {
          layer.setStyle({ fillOpacity: 0.28, weight: 2.5 });
        });
        layer.on("mouseout", () => {
          layer.setStyle({ fillOpacity: 0.12, weight: 1.5 });
        });

        // Click to zoom into province
        layer.on("click", () => {
          map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        });
      }
    }).addTo(map);
  });
```

---

## Up Next

In **[Part 7: AI Agent Integration — Powering LLMs with llms.txt](07-ai-agents-and-llms.md)**, we cover how autonomous coding assistants like Cursor and Claude use OpenGeo Cambodia's `llms.txt` context.

---

[← Previous: Part 5 — Reverse Geocoding & Search](../geocoding/05-geocoding-and-reverse-lookup.md) | [Next: Part 7 — AI Agents & LLMs →](07-ai-agents-and-llms.md)
