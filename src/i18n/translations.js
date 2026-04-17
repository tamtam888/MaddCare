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
    users: 'Users',
    dataSection: 'Data',
    carePlans: 'Care plans',
    appointments: 'Appointments',
    signOut: 'Sign out',
    admin: 'Admin',
    therapist: 'Therapist',
    treatmentManagement: 'Treatment management',

    // Dashboard
    welcomeBack: 'Welcome back',
    totalPatients: 'Total Patients',
    active: 'Active',
    notActive: 'Not Active',
    allRegistered: 'All registered patients',
    currentlyUnderCare: 'Currently under care',
    needsReview: 'Exception / needs review',
    conditionsDistribution: 'Conditions Distribution',
    quickActions: 'Quick Actions',
    noConditionData: 'No condition data yet. Add patients with conditions to see distribution.',

    // Quick actions
    viewAndManage: 'View and manage patient records.',
    treatmentCalendar: 'Treatment Calendar',
    openCalendar: 'Open the appointments calendar.',
    manageCarePlans: 'Manage care plans and exercises.',
    manageTherapists: 'Manage therapists and roles.',

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
  },

  he: {
    // Sidebar
    dashboard: 'לוח בקרה',
    patients: 'מטופלים',
    treatment: 'טיפול',
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
    needsReview: 'דורש בדיקה',
    conditionsDistribution: 'התפלגות מצבים',
    quickActions: 'פעולות מהירות',
    noConditionData: 'אין נתוני מצב. הוסף מטופלים עם מצבים לצפייה בהתפלגות.',

    // Quick actions
    viewAndManage: 'צפה ונהל רשומות מטופלים.',
    treatmentCalendar: 'לוח זמנים לטיפול',
    openCalendar: 'פתח את לוח הפגישות.',
    manageCarePlans: 'נהל תוכניות טיפול ותרגילים.',
    manageTherapists: 'נהל מטפלים ותפקידים.',

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
  },
};

export function t(lang, key) {
  return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
}
