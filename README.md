# MedicalCare

A React/Vite clinic management platform for therapists - patient management, intake workflows, treatment documentation, AI-assisted clinical summaries, care plans, media/video tracking, and appointment scheduling.

**Project Status:** Beta delivered to real pilot users, including physiotherapists and hydrotherapists, for feedback on patient management, treatment workflows, scheduling, AI-assisted documentation, and video-based progress tracking.

Built with product thinking in mind: structured data flow, separation of concerns, and real clinical workflows rather than isolated UI features.

---

## Links

- Live Demo: https://demo-medical-care.vercel.app

> Demo access is available through the login screen.

---

## What to Review

| Path | What it covers |
|------|----------------|
| `src/App.jsx` | Main application routing and layout structure |
| `src/pages/` | Route-level screens and clinical workflows |
| `src/components/` | Reusable UI components |
| `src/hooks/usePatients.js` | Patient data flow and shared state handling |
| `src/services/` | Data access, storage, templates, and workflow services |
| `src/utils/` | FHIR helpers, formatting utilities, and shared helpers |
| `src/appointments/` | Appointment and calendar-related workflow logic |
| `src/i18n/` | Hebrew/English translations and RTL support |

---

## Project Structure

```text
src/
  appointments/      Appointment and calendar-related UI logic
  components/        Reusable UI components
  hooks/             Custom React hooks and shared state/data logic
  i18n/              Hebrew/English translations and RTL support
  lib/               Shared configuration and integration helpers
  notifications/     Notification-related logic
  pages/             Route-level screens and clinical workflows
  services/          Data access, storage, templates, and workflow services
  therapists/        Therapist-related data and logic
  utils/             FHIR helpers, formatting utilities, and shared helpers
```

---

## Core Capabilities

**Patient management** - Structured patient profiles, treatment history, clinical status tracking, and long-term session records.

**Intake workflow** - Clinical intake forms connected to the treatment pipeline. Intake data feeds into treatment planning and media-based follow-up rather than existing as an isolated form.

**Treatment documentation** - Per-session notes with AI-assisted text refinement. Therapists write the clinical content; the AI helps with clarity and consistency.

**AI-assisted reporting** - Treatment summaries generated from session history. Uses de-identified data; personal patient details are excluded from AI inputs.

**Care plans and exercises** - Reusable templates, per-patient care plans, and exercise tracking as part of the structured clinical workflow.

**Media and video tracking** - A dedicated video workflow for physiotherapy-style progress tracking: movement observation, angle review, and visual comparison across sessions. Connected to the patient timeline and intake flow.

**Appointments and calendar** - Appointment management with therapist assignment, FullCalendar-based scheduling, and patient-linked visit history.

**Hebrew/English and RTL** - Bilingual support across the UI. RTL layout handling for Hebrew, with a shared translation context and key-based access throughout components.

**Privacy-aware design** - AI inputs are de-identified. Inline privacy notices are surfaced contextually at AI touchpoints and intake consent. Personal patient details are excluded from AI inputs.

---

## Frontend Architecture

The app is a single-page React/Vite application with client-side routing via React Router v7.

**State management** - The app does not rely on an external global state library. Patient data and auth state flow down from `App.jsx` via props, with `usePatients` owning the patient list, persistence, and mutation logic. This makes the data flow explicit and traceable across route-level pages.

**Component model** - Route-level pages (`src/pages/`) own workflow logic and compose from `src/components/`. Components are presentational where possible, with data and handlers passed in. Shared UI primitives such as `CollapsibleBlock`, `InlineEditable`, and `PatientHeader` are reused across pages.

**Custom hooks** - `usePatients`, `useAppointments`, `useAppointmentDrawer`, and related hooks encapsulate data access, persistence coordination, and local UI state for their domain. Logic that spans multiple views lives in hooks rather than being duplicated across page components.

**Services layer** - `src/services/` handles data access, Supabase queries, IndexedDB reads/writes, template loading, and workflow-related operations separately from component logic.

**Routing** - Protected routes, role-based access for admin and therapist flows, and layout composition are handled in `App.jsx`. Sidebar navigation is driven by auth context.

**Integrations** - Supabase is used for patient and appointment persistence. Medplum/FHIR helpers support healthcare-oriented data structure. IndexedDB via `idb-keyval` supports local state and offline-tolerant workflows. AI functionality is handled through a separate backend service.

---

## Data Flow and Separation of Concerns

```text
App.jsx
  usePatients hook
    owns patient list, persistence, update, delete, sync
  PatientsPage
    list view, search, filtering
  PatientDetailsPage
    full patient record, intake, history, care plan, reports
      AttachReports
        report generation, AI summary with de-identified input
      CarePlanSection
        goals and exercises
      PatientHistory
        session history with selection state

useAppointments hook
  appointment CRUD and Supabase sync
  CalendarTreatmentsPage
    FullCalendar view
  PatientDetailsPage
    per-patient upcoming and past visits through AppointmentDrawer

intakeService
  Supabase intake queries with RLS-aware access
  PatientDetailsPage
    View Intake panel fetches full intake_data on demand

LanguageContext
  active language and t() accessor
  all pages and components consume translated strings
```

The project is structured to keep clinical workflows readable and predictable:

- UI screens do not contain all data logic directly
- Patient state is separated from reusable UI components
- Service files handle storage and workflow-related operations
- Utility files handle transformation and helper logic
- Route-level pages coordinate flows rather than duplicating logic everywhere
- Most patient-related mutations are routed through shared hooks and services rather than duplicated across UI components

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19, Vite (rolldown-vite) |
| Routing | React Router v7 |
| Data persistence | Supabase, IndexedDB (idb-keyval) |
| Healthcare data | Medplum, FHIR resource helpers |
| Calendar | FullCalendar v6 |
| Forms | React Hook Form, Zod |
| Testing | Vitest, React Testing Library, Playwright-ready structure |
| Styling | Plain CSS organized by page/component, no CSS framework |
| Icons | Lucide React |
| AI | Custom backend service, not included in this repository |
| PDF generation | pdf-lib |
| i18n | Custom context-based solution |

---

## Branches

| Branch | Purpose |
|--------|---------|
| `main-clean` | Public portfolio branch for external review |
| `pilot-therapists-v1` | Active pilot branch for therapist testing |
| `portfolio-demo` | Demo-focused version for portfolio presentation |

The public portfolio branch is `main-clean`; pilot-specific work is maintained separately on `pilot-therapists-v1`.

---

## Run Locally

```bash
# Install dependencies
npm install

# Create a local environment file
# Add the required Supabase and integration variables manually

# Start dev server
npm run dev
```

Requires a Supabase project for full data functionality. The live demo is pre-configured.

---

## Quality Checks

```bash
npm run build          # production build
npm run lint           # ESLint
npm run test:run       # Vitest unit tests, single run
npm run test           # Vitest watch mode
npm run test:coverage  # coverage report
```

End-to-end tests use Playwright through `playwright.config.js`.

The project includes lint, build, and test tooling. Test coverage and lint status may evolve as the project is actively developed.

---

## Product Focus

The goal of this project was to build a coherent clinical tool, not a collection of unconnected features.

A few decisions that reflect that:

- **Intake connects to treatment.** Intake data is visible inside the patient record and feeds into treatment planning and media workflows; it is not a standalone form.
- **AI is scoped.** AI assistance is limited to documentation refinement and summary generation. Patient identity is excluded from AI inputs by design.
- **State is traceable.** Patient state and mutations are centralized through shared hooks and services where possible.
- **Bilingual from the start.** Hebrew and RTL support were built into the UI architecture rather than treated as a last-step translation layer.
- **Privacy is surfaced.** Privacy notices appear inline at the specific points where data may leave the app, such as AI summary and intake consent.
- **Beta validation.** MedicalCare was delivered to real pilot users for workflow validation and feedback.

---

## Notes

- This is a beta pilot product delivered to real pilot users for workflow feedback. It is not production healthcare software and does not claim HIPAA compliance.
- The AI backend is a separate service not included in this repository.
- The media/video module integration can be reviewed through the demo link; the companion video module is maintained separately.
- The demo is configured for portfolio review and may expose a curated subset of the full pilot workflow.
