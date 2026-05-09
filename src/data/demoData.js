/**
 * src/data/demoData.js
 *
 * Static demo data for Public Demo Mode.
 * These records are loaded instead of IDB/Supabase when mc_demo_mode === "true".
 * IDs use the 000100xxx range — clearly synthetic, never collide with real Israeli IDs.
 * therapistId: "demo" — matches the demo session's mc_therapistId.
 */

// ---------------------------------------------------------------------------
// Therapists
// ---------------------------------------------------------------------------

export const DEMO_THERAPISTS = [
  {
    id: 'demo',
    idNumber: '000200001',
    fullName: 'Demo User',
    firstName: 'Demo',
    lastName: 'User',
    username: 'demo',
    role: 'therapist',
    active: true,
    gender: 'not_specified',
    phone: '',
    email: '',
    address: '',
    workDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
  },
  {
    id: '000200002',
    idNumber: '000200002',
    fullName: 'Sarah Cohen',
    firstName: 'Sarah',
    lastName: 'Cohen',
    username: 'sarah',
    role: 'therapist',
    active: true,
    gender: 'Female',
    phone: '052-0000001',
    email: 'sarah@demo.local',
    address: 'Tel Aviv',
    workDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
  },
  {
    id: '000200003',
    idNumber: '000200003',
    fullName: 'Avi Levi',
    firstName: 'Avi',
    lastName: 'Levi',
    username: 'avi',
    role: 'therapist',
    active: true,
    gender: 'Male',
    phone: '052-0000002',
    email: 'avi@demo.local',
    address: 'Jerusalem',
    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  },
];

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export const DEMO_PATIENTS = [
  {
    id: '102030401',
    idNumber: '102030401',
    firstName: 'Yael',
    lastName: 'Cohen',
    fullName: 'Yael Cohen',
    dateOfBirth: '14/03/1980',
    gender: 'Female',
    phone: '050-1234567',
    email: 'yael.cohen@demo.local',
    address: 'Herzliya',
    clinicalStatus: 'Active',
    conditions: ['Lumbar disc herniation', 'Lower back pain'],
    therapistId: 'demo',
    history: [
      {
        id: 'hist-yael-intake-001',
        type: 'Note',
        title: 'Intake Assessment',
        date: '2026-04-25T10:00:00.000Z',
        summary:
          'Chief complaint: lower back pain with radiation to left leg, onset 6 weeks prior. Functional limitations: unable to sit >30 min, forward bending painful. Goal: return to full work capacity and resume daily walking. Desk worker, no prior physiotherapy.',
        text: 'Intake Assessment\n\nChief Complaint:\nLower back pain with intermittent radiation to the left leg. Onset approximately 6 weeks ago (mid-March 2026).\n\nPain Onset:\nGradual onset following prolonged desk work and a long commute. No acute injury or trauma. Worsens with prolonged sitting and forward bending.\n\nFunctional Limitations:\n- Unable to sit for more than 30 minutes without pain\n- Forward bending (e.g., tying shoes) is painful and limited\n- Sleep disrupted 3\u20134 nights per week due to discomfort\n- Reduced ability to concentrate at work\n\nPatient Goals:\n- Return to full work capacity without pain\n- Resume morning walks (currently avoided)\n- Avoid surgical intervention if possible\n- Understand exercises to manage symptoms independently\n\nRelevant Background:\nPatient works a sedentary desk job, approximately 8 hours per day. No significant comorbidities. No prior physiotherapy. MRI completed March 2026 \u2014 results forwarded with GP referral and reviewed at initial physiotherapy assessment.',
      },
      {
        id: 'hist-yael-001',
        type: 'Session',
        title: 'Initial Assessment',
        date: '2026-04-28T09:00:00.000Z',
        summary:
          'Patient presents with L4-L5 disc herniation. Reports pain radiating to left leg (VAS 6/10). Posture analysis performed. Prescribed McKenzie exercises and lumbar stabilization protocol.',
        text: 'Initial Assessment\n\nPatient presents with L4-L5 disc herniation confirmed by MRI (March 2026). Reports pain radiating to left leg (VAS 6/10). Posture analysis performed — forward head posture, increased lumbar lordosis.\n\nPrescribed McKenzie exercises and lumbar stabilization protocol. Follow-up in one week.',
      },
      {
        id: 'hist-yael-002',
        type: 'Session',
        title: 'Follow-up: Week 1',
        date: '2026-04-30T09:00:00.000Z',
        summary:
          'Patient reports pain reduced to VAS 4/10. Leg symptoms improving. Progressed to Phase 2 stabilization exercises. Compliance with home program confirmed.',
        text: 'Follow-up: Week 1\n\nPatient reports pain reduced to VAS 4/10. Leg symptoms improving. Compliance with home program confirmed.\n\nProgressed to Phase 2 stabilization exercises. Added prone press-up series.',
      },
      {
        id: 'hist-yael-003',
        type: 'Note',
        title: 'Phone Check-in',
        date: '2026-05-01T11:30:00.000Z',
        summary:
          'Patient called to confirm Tuesday appointment. No new symptoms. Continuing home exercises.',
        text: 'Phone Check-in\n\nPatient called to confirm Tuesday appointment. No new symptoms. Continuing home exercises as prescribed.',
      },
      {
        id: 'hist-yael-004',
        type: 'Session',
        title: 'Week 2 Progress',
        date: '2026-05-06T09:00:00.000Z',
        summary:
          'Pain reduced to VAS 2/10. Lumbar flexion at 75% normal range. Progressed to Phase 3 stabilization: bird-dog and side plank series. Good body mechanics in functional tasks. Home exercise compliance confirmed.',
        text: 'Week 2 Progress\n\nPain reduced to VAS 2/10 (from 4/10 at Week 1). Lumbar flexion at 75% normal range — steady improvement.\n\nProgressed to Phase 3 stabilization program: introduced bird-dog (alternating arm/leg) and side plank holds (20 sec). Patient demonstrates good body mechanics during functional task assessment (lifting, bending).\n\nHome exercise compliance confirmed — performing McKenzie press-ups and dead bug twice daily. Ergonomic review of workstation scheduled for next session.',
      },
      {
        id: 'hist-yael-report-001',
        type: 'report',
        title: 'AI Rehabilitation Progress Report',
        date: '2026-05-07T10:00:00.000Z',
        summary:
          'Generated from: Initial Assessment · Follow-up: Week 1 · Week 2 Progress\n\nClinical Summary — Lumbar Disc Herniation (L4-L5)\n\nPatient Overview:\nFemale patient presenting with L4-L5 disc herniation confirmed by MRI. Initial VAS pain score 6/10 with radiculopathy to left leg. Over a 10-day treatment course spanning 3 sessions, pain has reduced to VAS 2/10 with significant functional improvement.\n\nProgress Across Sessions:\n• Session 1 (Initial Assessment): Posture analysis, McKenzie protocol commenced. VAS 6/10.\n• Session 2 (Week 1 Follow-up): Phase 2 stabilization introduced. VAS 4/10. Radicular symptoms improving.\n• Session 3 (Week 2 Progress): Phase 3 stabilization: bird-dog and side plank. VAS 2/10. Full functional task compliance.\n\nRecommendations:\n- Continue Phase 3 home exercise program\n- Ergonomic workstation review (next session)\n- Reassess in 2 weeks; target full discharge by Week 6\n\nCompliance: High throughout treatment course.',
        text: 'Generated from: Initial Assessment · Follow-up: Week 1 · Week 2 Progress\n\nClinical Summary — Lumbar Disc Herniation (L4-L5)\n\nPatient Overview:\nFemale patient presenting with L4-L5 disc herniation confirmed by MRI. Initial VAS pain score 6/10 with radiculopathy to left leg. Over a 10-day treatment course spanning 3 sessions, pain has reduced to VAS 2/10 with significant functional improvement.\n\nProgress Across Sessions:\n• Session 1 (Initial Assessment): Posture analysis, McKenzie protocol commenced. VAS 6/10.\n• Session 2 (Week 1 Follow-up): Phase 2 stabilization introduced. VAS 4/10. Radicular symptoms improving.\n• Session 3 (Week 2 Progress): Phase 3 stabilization: bird-dog and side plank. VAS 2/10. Full functional task compliance.\n\nRecommendations:\n- Continue Phase 3 home exercise program\n- Ergonomic workstation review (next session)\n- Reassess in 2 weeks; target full discharge by Week 6\n\nCompliance: High throughout treatment course.',
      },
    ],
    carePlan: {
      goals: [
        {
          id: 'goal-yael-001',
          title: 'Reduce pain to VAS ≤ 2',
          status: 'Achieved',
          targetDate: '2026-05-20',
          notes: 'VAS 6/10 → 4/10 → 2/10 over 3 sessions. Goal achieved at Week 2. Maintenance phase active.',
        },
        {
          id: 'goal-yael-002',
          title: 'Full return to work without restrictions',
          status: 'Planned',
          targetDate: '2026-07-01',
          notes: 'Patient works desk job — ergonomic review scheduled.',
        },
        {
          id: 'goal-yael-003',
          title: 'Independent home exercise management',
          status: 'In progress',
          targetDate: '2026-06-15',
          notes: 'Patient performing Phase 3 program independently. Ergonomic review and self-management education in progress.',
        },
      ],
      exercises: [
        {
          id: 'ex-yael-001',
          name: 'McKenzie Press-up',
          sets: 3,
          reps: 10,
          frequency: 'Twice daily',
          instructions: 'Lie prone, press up with arms keeping hips on floor. Hold 2 sec at top.',
          startDate: '2026-04-28',
        },
        {
          id: 'ex-yael-002',
          name: 'Lumbar Stabilization — Dead Bug',
          sets: 3,
          reps: 8,
          frequency: 'Daily',
          instructions: 'Supine, arms and knees at 90°. Lower alternating arm/leg while maintaining neutral spine.',
          startDate: '2026-04-30',
        },
        {
          id: 'ex-yael-003',
          name: 'Bird-Dog',
          sets: 3,
          reps: 10,
          frequency: 'Daily',
          instructions: 'On hands and knees, extend opposite arm and leg simultaneously. Hold 3 sec. Maintain neutral spine throughout.',
          startDate: '2026-05-06',
        },
        {
          id: 'ex-yael-004',
          name: 'Side Plank Hold',
          sets: 3,
          reps: '20 sec',
          frequency: 'Daily',
          instructions: 'Side-lying, supported on forearm and feet. Keep hips elevated and spine neutral. Hold 20 seconds per side.',
          startDate: '2026-05-06',
        },
      ],
    },
  },

  {
    id: '204060802',
    idNumber: '204060802',
    firstName: 'Moshe',
    lastName: 'Levi',
    fullName: 'Moshe Levi',
    dateOfBirth: '22/07/1962',
    gender: 'Male',
    phone: '050-2345678',
    email: 'moshe.levi@demo.local',
    address: 'Tel Aviv',
    clinicalStatus: 'Stable',
    conditions: ['Post total knee replacement (right)', 'Knee OA'],
    therapistId: 'demo',
    history: [
      {
        id: 'hist-moshe-001',
        type: 'Session',
        title: 'Post-op Week 3 Assessment',
        date: '2026-04-20T11:00:00.000Z',
        summary:
          'ROM: 0-85°. Swelling moderate. Gait with walker, partial weight bearing. Quad sets and straight leg raises commenced.',
        text: 'Post-op Week 3 Assessment\n\nROM: 0-85° (target 0-90° by week 4). Swelling moderate, ice and compression recommended.\n\nGait with walker, partial weight bearing. Commenced quad sets and straight leg raises. Pain managed, VAS 3/10 at rest.',
      },
      {
        id: 'hist-moshe-002',
        type: 'Session',
        title: 'Post-op Week 5 — Progression',
        date: '2026-05-04T11:00:00.000Z',
        summary:
          'ROM improved to 0-100°. Weaned off walker to single crutch. Mini-squats introduced. Patient pleased with progress.',
        text: 'Post-op Week 5 — Progression\n\nROM improved to 0-100° (exceeded 4-week target). Weaned off walker, now using single crutch.\n\nMini-squats and step-ups (low step) introduced. Patient pleased with progress. Next target: unaided ambulation by week 8.',
      },
    ],
    carePlan: {
      goals: [
        {
          id: 'goal-moshe-001',
          title: 'Full ROM (0-120°)',
          status: 'In progress',
          targetDate: '2026-06-15',
          notes: 'Currently 0-100°.',
        },
        {
          id: 'goal-moshe-002',
          title: 'Independent ambulation without aids',
          status: 'In progress',
          targetDate: '2026-06-01',
          notes: 'Using single crutch — good progress.',
        },
      ],
      exercises: [
        {
          id: 'ex-moshe-001',
          name: 'Quad Sets',
          sets: 3,
          reps: 15,
          frequency: '3× daily',
          instructions: 'Supine, tighten quadriceps pushing knee into surface. Hold 5 sec.',
          startDate: '2026-04-20',
        },
        {
          id: 'ex-moshe-002',
          name: 'Mini Squat',
          sets: 3,
          reps: 10,
          frequency: 'Daily',
          instructions: 'Stand holding support. Bend knees to 30°, hold 2 sec. Keep heels flat.',
          startDate: '2026-05-04',
        },
      ],
    },
  },

  {
    id: '306091203',
    idNumber: '306091203',
    firstName: 'Noa',
    lastName: 'Goldberg',
    fullName: 'Noa Goldberg',
    dateOfBirth: '05/11/1997',
    gender: 'Female',
    phone: '054-3456789',
    email: 'noa.goldberg@demo.local',
    address: 'Haifa',
    clinicalStatus: 'Active',
    conditions: ['Shoulder impingement syndrome (right)', 'Rotator cuff tendinopathy'],
    therapistId: 'demo',
    history: [
      {
        id: 'hist-noa-001',
        type: 'Session',
        title: 'Initial Shoulder Assessment',
        date: '2026-04-22T14:00:00.000Z',
        summary:
          'Painful arc 70-120°. Positive Neer and Hawkins-Kennedy tests. Supraspinatus weakness. Postural assessment: rounded shoulders, forward head.',
        text: 'Initial Shoulder Assessment\n\nPainful arc 70-120°. Positive Neer and Hawkins-Kennedy tests. Supraspinatus weakness on empty can test.\n\nPostural assessment: rounded shoulders, forward head posture. Upper traps overactive, lower traps weak.\n\nPlan: rotator cuff strengthening, scapular stabilization, postural correction.',
      },
      {
        id: 'hist-noa-002',
        type: 'Session',
        title: 'Week 2 Progress',
        date: '2026-05-05T14:00:00.000Z',
        summary:
          'Painful arc reduced to 80-110°. Patient tolerating external rotation strengthening. Scapular retraction drills progressing well.',
        text: 'Week 2 Progress\n\nPainful arc reduced to 80-110° — improvement noted. Patient tolerating external rotation strengthening with yellow Theraband.\n\nScapular retraction drills progressing well. Added W exercise for lower trapezius activation.',
      },
    ],
    carePlan: {
      goals: [
        {
          id: 'goal-noa-001',
          title: 'Pain-free overhead reach',
          status: 'In progress',
          targetDate: '2026-06-30',
          notes: 'Patient is a swimmer — goal is return to training.',
        },
      ],
      exercises: [
        {
          id: 'ex-noa-001',
          name: 'External Rotation — Theraband',
          sets: 3,
          reps: 15,
          frequency: 'Daily',
          instructions: 'Elbow at 90°, band fixed at elbow height. Rotate arm outward, hold 2 sec.',
          startDate: '2026-04-22',
        },
        {
          id: 'ex-noa-002',
          name: 'W Exercise — Scapular Retraction',
          sets: 3,
          reps: 12,
          frequency: 'Daily',
          instructions: 'Stand or prone. Elbows bent at 90°. Squeeze shoulder blades together and down, holding W shape. Hold 3 sec.',
          startDate: '2026-04-29',
        },
      ],
    },
  },

  {
    id: '408121604',
    idNumber: '408121604',
    firstName: 'David',
    lastName: 'Ben-David',
    fullName: 'David Ben-David',
    dateOfBirth: '19/06/1990',
    gender: 'Male',
    phone: '052-4567890',
    email: 'david.bd@demo.local',
    address: 'Beer Sheva',
    clinicalStatus: 'Active',
    conditions: ['Grade II lateral ankle sprain (left)', 'Peroneal tendon strain'],
    therapistId: 'demo',
    history: [
      {
        id: 'hist-david-001',
        type: 'Session',
        title: 'Acute Ankle Assessment',
        date: '2026-04-27T10:00:00.000Z',
        summary:
          'Grade II lateral sprain following basketball injury. Swelling and bruising over ATF ligament. RICE protocol, weight bearing as tolerated.',
        text: 'Acute Ankle Assessment\n\nGrade II lateral ankle sprain following basketball injury (April 25). Swelling and bruising over ATF ligament. Ottawa rules negative (no fracture).\n\nRICE protocol. Weight bearing as tolerated with compression bandage. Gentle ROM exercises commenced.',
      },
      {
        id: 'hist-david-002',
        type: 'Session',
        title: 'Week 1 Follow-up',
        date: '2026-05-06T10:00:00.000Z',
        summary:
          'Swelling reduced significantly. Full weight bearing achieved. Commenced proprioception training on wobble board. Peroneal strengthening with band.',
        text: 'Week 1 Follow-up\n\nSwelling reduced significantly. Full weight bearing achieved without pain.\n\nCommenced proprioception training on wobble board. Peroneal strengthening with resistance band introduced. Target: return to sport in 4-6 weeks.',
      },
    ],
    carePlan: {
      goals: [
        {
          id: 'goal-david-001',
          title: 'Return to sport (basketball)',
          status: 'In progress',
          targetDate: '2026-06-08',
          notes: 'Patient is competitive — keen to return. Progressing well.',
        },
      ],
      exercises: [
        {
          id: 'ex-david-001',
          name: 'Single-leg Balance — Wobble Board',
          sets: 3,
          duration: '30 sec',
          frequency: 'Daily',
          instructions: 'Stand on wobble board, single leg. Progress to eyes closed when stable.',
          startDate: '2026-05-04',
        },
        {
          id: 'ex-david-002',
          name: 'Peroneal Strengthening — Eversion Band',
          sets: 3,
          reps: 15,
          frequency: 'Daily',
          instructions: 'Seated, band around foot. Evert foot against resistance, hold 2 sec.',
          startDate: '2026-05-04',
        },
      ],
    },
  },

  {
    id: '510152005',
    idNumber: '510152005',
    firstName: 'Ruth',
    lastName: 'Shapiro',
    fullName: 'Ruth Shapiro',
    dateOfBirth: '03/02/1955',
    gender: 'Female',
    phone: '050-5678901',
    email: '',
    address: 'Ramat Gan',
    clinicalStatus: 'Not Active',
    conditions: ['Hip osteoarthritis (bilateral)', 'Gait dysfunction'],
    therapistId: 'demo',
    history: [
      {
        id: 'hist-ruth-001',
        type: 'Session',
        title: 'Discharge Assessment',
        date: '2026-04-10T09:00:00.000Z',
        summary:
          'Patient completed 8-week strengthening program. Pain managed (VAS 2/10). Hip extension and abductor strength improved. Discharged with home exercise program.',
        text: 'Discharge Assessment\n\nPatient completed 8-week hip strengthening program. Pain managed (VAS 2/10 on most days).\n\nHip extension strength improved from 3/5 to 4/5. Abductor strength 3+/5. Gait pattern improved — reduced Trendelenburg sign.\n\nDischarged with home exercise program. Return if symptoms worsen.',
      },
    ],
    carePlan: {
      goals: [
        {
          id: 'goal-ruth-001',
          title: 'Maintain independence in ADLs',
          status: 'Achieved',
          targetDate: '2026-04-10',
          notes: 'Goal met at discharge.',
        },
      ],
      exercises: [
        {
          id: 'ex-ruth-001',
          name: 'Clamshell — Hip Abduction',
          sets: 3,
          reps: 15,
          frequency: 'Daily',
          instructions: 'Side lying, knees bent. Open top knee like a clamshell. Keep hips stacked.',
          startDate: '2026-02-17',
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Appointments
// (Dates relative to 2026-05-03 as "today")
// ---------------------------------------------------------------------------

export const DEMO_APPOINTMENTS = [
  {
    id: 'demo-appt-001',
    patientId: '102030401',
    therapistId: 'demo',
    start: '2026-04-28T09:00:00.000Z',
    end: '2026-04-28T10:00:00.000Z',
    status: 'completed',
    notes: 'Initial assessment. Lumbar stabilization protocol commenced.',
  },
  {
    id: 'demo-appt-002',
    patientId: '102030401',
    therapistId: 'demo',
    start: '2026-04-30T09:00:00.000Z',
    end: '2026-04-30T10:00:00.000Z',
    status: 'completed',
    notes: 'Week 1 follow-up. Progressed to Phase 2 exercises.',
  },
  {
    id: 'demo-appt-003',
    patientId: '204060802',
    therapistId: 'demo',
    start: '2026-05-04T11:00:00.000Z',
    end: '2026-05-04T12:00:00.000Z',
    status: 'scheduled',
    notes: 'Post-op week 5. ROM assessment and gait progression.',
  },
  {
    id: 'demo-appt-004',
    patientId: '102030401',
    therapistId: 'demo',
    start: '2026-05-05T09:00:00.000Z',
    end: '2026-05-05T10:00:00.000Z',
    status: 'scheduled',
    notes: 'Week 2 follow-up. Advance stabilization and posture work.',
  },
  {
    id: 'demo-appt-005',
    patientId: '306091203',
    therapistId: 'demo',
    start: '2026-05-05T14:00:00.000Z',
    end: '2026-05-05T14:30:00.000Z',
    status: 'scheduled',
    notes: 'Week 2 shoulder review. Progress scapular stabilization.',
  },
  {
    id: 'demo-appt-006',
    patientId: '408121604',
    therapistId: 'demo',
    start: '2026-05-06T10:00:00.000Z',
    end: '2026-05-06T10:30:00.000Z',
    status: 'scheduled',
    notes: 'Ankle week 1 follow-up. Proprioception and peroneal strengthening.',
  },
  {
    id: 'demo-appt-007',
    patientId: '204060802',
    therapistId: 'demo',
    start: '2026-05-11T11:00:00.000Z',
    end: '2026-05-11T12:00:00.000Z',
    status: 'scheduled',
    notes: 'Post-op week 6. Stair training and closed-chain progression.',
  },
];
