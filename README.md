# Ryan's CareConnect

A mobile-first progressive web app for coordinating daily care for Ryan Nguyen (DOB: 10/28/2003), a patient with Diabetes Insipidus. Built for a team of four caregivers — Mary, Jon, Rafi, and Maverick — to log medications, tasks, fluid intake, lab results, and supply inventory in real time.

---

## Live App

**GitHub Pages:** `https://bruinesq.github.io/careconnect`

Open in Safari on iPhone. Add to Home Screen for the best experience.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript, HTML, CSS |
| Hosting | GitHub Pages (free, CDN-delivered) |
| Database | Supabase (PostgreSQL via REST API) |
| Fonts | Syne (labels/headings) + IBM Plex Mono (numbers/times) |
| PDF Reports | Google Apps Script (legacy, kept for report generation only) |

---

## File Structure

```
careconnect/
├── index.html          # App shell — header, nav bar, view container
├── app.js              # All UI rendering and business logic (~1750 lines)
├── config.js           # Supabase URL, anon key, REST helper functions
├── style.css           # Global styles, theme variables, modal CSS
└── README.md           # This file
```

### Legacy Google Apps Script files (CareConnect_v2)
These remain deployed for PDF report generation only:
```
Code.gs                 # doGet handler + PDF API endpoint
PDF.gs                  # Clinical report generation logic
Style.html              # CSS (kept in sync with style.css)
index.html              # GAS app shell (backup)
JavaScript.html         # GAS version of app.js (backup)
```

---

## Supabase Configuration

**Project URL:** `https://vpohfpyouwshqgkntxzm.supabase.co`

### Tables

**`logs`** — All care events
| Column | Type | Description |
|---|---|---|
| `id` | int8 | Auto-increment primary key |
| `date` | text | `YYYY-MM-DD` |
| `type` | text | `Medication`, `Routine`, `Water`, `Urine`, `BM`, `Labs`, `Report` |
| `amount` | text | Description or quantity |
| `time` | text | `h:mm AM/PM` (LA local time) |
| `caregiver` | text | Mary, Jon, Rafi, or Maverick |
| `metadata` | text | Group name, lab JSON, or report URL |
| `created_at` | timestamptz | Auto, used as sort tiebreaker |

**`settings`** — App configuration (key-value)
| Key | Description |
|---|---|
| `water_limit` | Daily water limit in ml (default: 1200) |
| `schedule` | JSON — full Meds and Tasks schedule |
| `gh_count` | GH injection dose counter (resets at 24) |
| `gh_reset_date` | Date of last GH cycle reset |
| `rx_data` | JSON — full Rx/Supplies tracker data |

### Row Level Security
Both tables have RLS enabled with full anon access (read/write) — appropriate for a trusted family care team using a shared URL.

---

## Pages

### 💊 Meds
- Displays Ryan's medication schedule grouped by time (6:00 AM, 12:00 PM, 5:00 PM, 6:00 PM)
- Caregiver selects their name before logging
- DONE stamps appear with time and caregiver name when a med is logged
- GH injection tracks dose number (e.g. 18/24) with auto-reset at 24
- Schedule editable via ✏️ pencil — drag to reorder, add/remove items
- Theme: Royal Blue gradient (lightens toward bottom)

### ✅ Tasks
- Same structure as Meds — shows Ryan's daily care routines
- Categories: General, Therapy
- DONE stamps show caregiver and time
- Theme: Cyan Sky + Gold

### 💧 In-Out
- **Water:** Tracks intake vs. daily limit with vertical progress bar. Warns when over limit.
- **Urine:** Shows last 4 entries with scroll
- **BM:** Event count with size breakdown (S×1, M×2, etc.)
- All three sections independently scrollable, fixed heights
- Theme: Cyan Sky gradient

### 📋 Logs
- Full daily log view, grouped by category
- Sorted newest-first within each category
- Tap ✕ to delete any entry (confirmation required)
- Navigable by date via header date picker
- Theme: Cyan Sky + Gold

### 🔬 Labs
- Displays lab panel results with visual range markers
- Out-of-range values highlighted in red
- OLDER/NEWER navigation between past panels
- 🔍 calendar picker — dates with results shown in gold, others grayed out
- 🔬 ANALYSIS generates clinical narrative
- PDF export via GAS endpoint
- Theme: Cyan Sky + Gold

### Rₓ Tracker
- Two scrollable sections: **Medications** and **Supplies**
- Each item shows: Supply (days), Re-filled (date), Remaining (auto-calculated)
- Sorted by least days remaining, then alphabetically
- Tap any item to edit; ✕ Remove button to delete
- ⚠️ Low Supply Alert fires when any item ≤5 days remaining
  - **Remind in 3 hrs** — snoozes alert, re-fires after 3 hours
  - **Stop Reminding** — suppresses until item is refilled
- Data persists to Supabase `settings` key `rx_data`
- Default Medications: Levothyroxine, Hydrocortisone, Keppra, Desmopressin, GH, Cortef, Protein, Ipratropium, Sodium Chloride, Valtico, Testosterone
- Default Supplies: Face Mask, Head Strap, Ventilator Tube, Water Chamber, Incontinence, Filters, CoughAssist Mask/Tube

---

## Key Features

### Travel Mode ✈️
- Toggle on the Meds/Tasks page (airplane icon, User row)
- Adjusts all time calculations for timezone offset
- Airplane turns gold when active

### GH Injection Counter
- Tracks dose number across 24-dose cycle
- Auto-increments on each GH log
- Displays on Meds page as gold badge (e.g. `18/24`)
- Resets to 1 after dose 24

### Clinical PDF Reports
- Generated via Google Apps Script
- Opens in new tab, generates report (~15 seconds)
- Auto-logs report entry to Supabase when complete
- Report appears in Logs page with View and Share links

### Date Navigation
- Header date picker controls all pages simultaneously
- Logs and Labs pages are independently navigable

---

## Caregivers

| Name | Device |
|---|---|
| Mary | iPhone (home device 🏠) |
| Jon | — |
| Rafi | — |
| Maverick | — |

The active caregiver is stored in `localStorage` per device. All 4 can use the app simultaneously — data is shared in real time via Supabase.

---

## Design System

### Colors
| Role | Value |
|---|---|
| Meds background | `linear-gradient(180deg, #1a3a8f → #3d82e0)` Royal Blue |
| All other pages | `linear-gradient(160deg, #0e7490 → #0891b2 → #0e6989)` Cyan Sky |
| Gold accent | `#fde68a` — active buttons, headers, nav |
| Cyan accent | `#38e8ff` — Meds section headers, lab markers |
| Alert red | `#e63946` — low supply, out-of-range, delete |
| Nav bar | `#042f3d` Dark teal |
| Modals/keypads | `linear-gradient(180deg, #0e7490 → #083d4f)` |

### Fonts
- **Syne** — all labels, headings, button text, category names
- **IBM Plex Mono** — all numbers, times, amounts, lab values, done stamps

### Layout
- Fixed header: 44px
- Fixed nav bar: 52px
- Main content: `position:fixed; top:44px; bottom:52px`
- Optimized for iPhone Pro and Pro Max screen sizes

---

## Data Migration

Historical data was migrated from Google Sheets (Ryan's CareConnect v2) to Supabase using `Migrate.gs`. Key functions:

| Function | Description |
|---|---|
| `clearSupabaseLogs` | Wipes all logs from Supabase |
| `migrateToSupabaseV2` | Full migration from all sheet tabs |
| `topUpMigration` | Adds missing date ranges from `2026-05` tab |
| `deduplicateLogs` | Removes duplicate rows by date+type+amount+time+caregiver |
| `fixCorruptedTimes` | Patches time values corrupted by GAS Date serialization |
| `patchTodayMeds` | Patches specific date's medication metadata |
| `checkSupabaseByDate` | Verifies row counts for specific dates |

---

## Development Notes

- All `google.script.run` calls replaced with `fetch()` to Supabase REST API
- `sbGet()`, `sbInsert()`, `sbDelete()`, `sbUpsert()` helpers defined in `config.js`
- Time values are stored as LA local time strings (`h:mm AM/PM`) — travel mode offsets are applied at logging time, not storage time
- No build tools, no bundler — pure vanilla JS served as static files
- The app works as a PWA candidate — adding a `manifest.json` and service worker would enable offline mode and home screen install prompt

---

## GAS PDF Endpoint

`https://script.google.com/macros/s/AKfycbzP1aTNY_pc0VAlQihSz-Gwi3rm5g-uFlBXapszIyG3Pt9BuoRX16mlfo2WPR5crAxbNA/exec`

Called with `?action=generateReport` — generates a 14-day clinical PDF, saves to Google Drive, and logs the report entry to Supabase.

---

## Patient Information

**Patient:** Ryan Nguyen  
**DOB:** October 28, 2003  
**Diagnosis:** Diabetes Insipidus  
**Spreadsheet (legacy):** `1dgMxkmTUHfWLkPyIEMN2AFvUD6BJ3yOtYUNYSpekJG8`

---

*Built with Claude (Anthropic) — May 2026*
