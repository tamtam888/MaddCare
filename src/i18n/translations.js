// src/i18n/translations.js
// Add more languages here in the future (ar, ru, etc.)

export const LANGUAGES = [
  { code: 'en', label: 'EN', dir: 'ltr', name: 'English' },
  { code: 'he', label: 'HE', dir: 'rtl', name: 'עברית' },
];

export const translations = {
  en: {
    // Sidebar
    dashboard: 'Dashboard',
    patients: 'Patients',
    treatment: 'Treatment',
    media: 'Video Sessions',
    users: 'Users',
    dataSection: 'Data',
    carePlans: 'Care Plans',
    appointments: 'Appointments',
    signOut: 'Sign out',
    admin: 'Admin',
    therapist: 'Therapist',
    treatmentManagement: 'Treatment Management',

    // Dashboard
    welcomeBack: 'Welcome back',
    totalPatients: 'Total Patients',
    active: 'Active',
    notActive: 'Not Active',
    allRegistered: 'All registered patients',
    currentlyUnderCare: 'Currently under care',
    needsReview: 'Inactive — may need review',
    conditionsDistribution: 'Conditions Distribution',
    quickActions: 'Quick Actions',
    noConditionData: 'No condition data yet. Add patients with conditions to see the distribution.',

    // Quick actions
    viewAndManage: 'Search, view and add patient records.',
    treatmentCalendar: 'Treatment Calendar',
    openCalendar: 'Schedule and manage patient appointments.',
    manageCarePlans: 'Manage care plans, goals and exercises.',
    manageTherapists: 'Manage therapist accounts and roles.',

    // Login
    therapistLogin: 'Therapist Login',
    fullName: 'Full name',
    idNumber: 'ID number',
    signingIn: 'Signing in...',
    signIn: 'Sign in',
    loginError: 'Name and ID do not match any therapist.',

    // Common
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',

    // PatientsPage
    patientDirectory: 'Patient Directory',
    managePatientsSubtitle: 'Manage patients and their clinical details.',
    import: 'Import',
    exportJson: 'Export JSON',
    syncAll: 'Sync All',
    addPatient: 'Add Patient',
    searchPatientsPlaceholder: 'Search by ID, name or condition...',
  },

  he: {
    // Sidebar
    dashboard: 'לוח בקרה',
    patients: 'מטופלים',
    treatment: 'טיפול',
    media: 'וידיאו',
    users: 'משתמשים',
    dataSection: 'נתונים',
    carePlans: 'תוכניות טיפול',
    appointments: 'תורים',
    signOut: 'התנתקות',
    admin: 'מנהל',
    therapist: 'מטפל',
    treatmentManagement: 'ניהול טיפולים',

    // Dashboard
    welcomeBack: 'ברוך הבא',
    totalPatients: 'סה״כ מטופלים',
    active: 'פעילים',
    notActive: 'לא פעילים',
    allRegistered: 'כל המטופלים הרשומים',
    currentlyUnderCare: 'כרגע בטיפול',
    needsReview: 'לא פעיל — דורש בדיקה',
    conditionsDistribution: 'התפלגות מצבים',
    quickActions: 'פעולות מהירות',
    noConditionData: 'אין נתוני מצב. הוסף מטופלים עם מצבים לצפייה בהתפלגות.',

    // Quick actions
    viewAndManage: 'חפש, צפה והוסף רשומות מטופלים.',
    treatmentCalendar: 'לוח זמנים לטיפול',
    openCalendar: 'קבע ונהל פגישות מטופלים.',
    manageCarePlans: 'נהל תוכניות טיפול, יעדים ותרגילים.',
    manageTherapists: 'נהל חשבונות ותפקידי מטפלים.',

    // Login
    therapistLogin: 'כניסת מטפל',
    fullName: 'שם מלא',
    idNumber: 'מספר תעודת זהות',
    signingIn: 'מתחבר...',
    signIn: 'כניסה',
    loginError: 'השם ומספר הזהות אינם תואמים אף מטפל.',

    // Common
    back: 'חזרה',
    save: 'שמור',
    cancel: 'ביטול',
    close: 'סגור',
    delete: 'מחק',
    edit: 'ערוך',
    add: 'הוסף',
    search: 'חיפוש',
    loading: 'טוען...',

    // PatientsPage
    patientDirectory: 'ספריית מטופלים',
    managePatientsSubtitle: 'נהל מטופלים ופרטיהם הקליניים.',
    import: 'יבא',
    exportJson: 'ייצא JSON',
    syncAll: 'סנכרן הכל',
    addPatient: 'הוסף מטופל',
    searchPatientsPlaceholder: 'חפש לפי מזהה, שם או מצב...',
  },
};

export function t(lang, key) {
  return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
}
