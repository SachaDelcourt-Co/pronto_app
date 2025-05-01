import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import 'intl-pluralrules';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPPORTED_LANGUAGES = {
  fr: 'Français',
  nl: 'Nederlands',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

const resources = {
  fr: {
    translation: {
      common: {
        at: 'à',
        on: 'le',
        yes: 'Oui',
        no: 'Non',
        ok: 'OK',
        cancel: 'Annuler',
        save: 'Enregistrer',
        delete: 'Supprimer',
        edit: 'Modifier',
        create: 'Créer',
        loading: 'Chargement...',
        today: 'Aujourd\'hui',
        done: 'Terminé',
        day: 'Jour',
        month: 'Mois',
        year: 'Année',
        hour: 'Heure',
        minute: 'Minute'
      },
      navigation: {
        home: 'Accueil',
        tasks: 'Tâches',
        appointments: 'RDV',
        reminders: 'Rappels',
        notes: 'Notes'
      },
      login: {
        title: 'PRONTO',
        subtitle: 'Votre Assistant Personnel',
        email: 'Adresse email',
        password: 'Mot de passe',
        login: 'Se connecter',
        register: 'Créer un compte',
        loginButton: 'Se connecter',
        createAccount: 'Créer un compte',
        forgotPassword: 'Mot de passe oublié ?',
        privacyPolicy: 'Politique de confidentialité',
        termsOfUse: 'Conditions d\'utilisation',
        selectMotivations: 'Sélectionner vos motivations (max. 2)',
        invalidCredentials: 'Email ou mot de passe incorrect',
        selectLanguage: 'Sélectionner la langue',
        fieldsRequired: 'Tous les champs sont requis',
        acceptTerms: 'Veuillez accepter les conditions d\'utilisation',
        selectMotivationsRequired: 'Veuillez sélectionner au moins une motivation',
        registrationError: 'Une erreur est survenue lors de l\'inscription',
        emailInUse: 'Cette adresse email est déjà utilisée',
        invalidEmail: 'Adresse email invalide',
        weakPassword: 'Le mot de passe est trop faible',
        termsAgreement: 'J\'accepte la',
        and: 'et les'
      },
      home: {
        subtitle: 'Votre Assistant Personnel',
        todaySchedule: 'Programme du jour',
        appointments: 'Rendez-vous',
        reminders: 'Rappels',
        noUpcomingAppointments: 'Aucun rendez-vous à venir',
        noReminders: 'Aucun rappel',
        seeMore: 'Voir plus...',
        showLess: 'Voir moins',
        seeAll: 'Voir tout',
        schedule: 'Agenda',
        dailyTasks: 'Tâches quotidiennes',
        noTasks: 'Aucune tâche pour aujourd\'hui',
        loadingTasks: 'Chargement des tâches...',
        done: 'Terminé',
        days: 'jours',
        appointmentDetails: 'Détails du rendez-vous',
        reminderDetails: 'Détails du rappel',
        editAppointment: 'Modifier le rendez-vous',
        editReminder: 'Modifier le rappel',
        notifications: 'Notifications',
        recurringOn: 'Récurrent le:',
        menu: {
          activitySummary: 'Résumé d\'activité',
          tasks: 'Tâches',
          appointments: 'Rendez-vous',
          reminders: 'Rappels',
          accountInfo: 'Infos du compte',
          lastActivity: 'Dernière activité:',
          language: 'Langue:',
          motivations: 'Motivations:',
          appInfo: 'Infos de l\'app',
          version: 'Version:',
          contactSupport: 'Contacter le support',
          supportEmail: 'Pour toute assistance, contactez: prontoapp.info@gmail.com',
          editMotivations: 'Modifier mes motivations',
          logOut: 'Se déconnecter'
        }
      },
      motivations: {
        sport: 'Sport',
        business: 'Business',
        studies: 'Études',
        wellbeing: 'Bien-être',
        parenting: 'Parentalité',
        personalDevelopment: 'Développement Personnel',
        financialManagement: 'Gestion Financière'
      },
      onboarding: {
        notifications: {
          title: 'Restez informé',
          description: 'Activez les notifications pour ne rien manquer',
          features: {
            appointments: 'Rappels de rendez-vous',
            reminders: 'Notifications personnalisées',
            tasks: 'Suivi des tâches',
            motivation: 'Messages motivants',
            support: 'Support personnalisé'
          },
          allow: 'Activer les notifications',
          note: 'Vous pourrez modifier ces paramètres plus tard'
        },
        features: {
          title: 'Découvrez vos fonctionnalités',
          subtitle: 'Voici ce qui vous attend dans votre assistant personnel',
          motivation: {
            title: 'Motivation',
            description: 'Recevez des messages motivants personnalisés selon vos objectifs'
          },
          appointments: {
            title: 'Rendez-vous',
            description: 'Gérez facilement tous vos rendez-vous importants'
          },
          reminders: {
            title: 'Rappels',
            description: 'Créez des rappels personnalisés pour ne rien oublier'
          },
          tasks: {
            title: 'Tâches',
            description: 'Suivez vos tâches quotidiennes et hebdomadaires'
          },
          reports: {
            title: 'Rapports',
            description: 'Visualisez vos progrès avec des rapports détaillés'
          },
          examples: {
            title: 'Commencez par créer vos tâches quotidiennes\n\nExemple:',
            water: 'Boire plus d\'1L d\'eau par jour',
            sport: 'Faire de l\'exercice régulièrement',
            meditation: 'Lire un livre',
            reading: 'Prendre soin de soi',
            healthy: 'Manger sainement'
          },
          continue: 'Continuer'
        }
      },
      legal: {
        lastUpdated: 'Dernière mise à jour : 1 février 2024',
        privacyContent: 'Contenu de la politique de confidentialité...',
        termsContent: 'Contenu des conditions d\'utilisation...'
      },
      appointments: {
        title: 'Rendez-vous',
        subtitle: 'Gérez vos rendez-vous',
        selectDate: 'Sélectionner une date',
        noAppointments: 'Aucun rendez-vous',
        noAppointmentsForDate: 'Aucun rendez-vous pour cette date',
        createAppointment: 'Créer un rendez-vous',
        editAppointment: 'Modifier le rendez-vous',
        appointmentName: 'Titre du rendez-vous',
        date: 'Date',
        startTime: 'Heure de début',
        endTime: 'Heure de fin',
        description: 'Description',
        address: 'Adresse',
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        loading: 'Chargement des rendez-vous...',
        deleteConfirmation: 'Êtes-vous sûr de vouloir supprimer ce rendez-vous?',
        deleteConfirmationTitle: 'Supprimer le rendez-vous',
        appointmentsFor: 'Rendez-vous pour {{date}}',
        upcomingAppointments: 'Rendez-vous à venir',
        edit: 'Modifier',
        appointmentDetails: 'Détails du rendez-vous',
        notifications: 'Notifications',
        noNotifications: 'Aucune notification',
        selectNotifications: 'Sélectionner les notifications',
        selectUpToThree: 'Sélectionnez jusqu\'à 3 rappels',
        notificationOptions: {
          fifteenMinutes: '15 minutes avant',
          oneHour: '1 heure avant',
          threeHours: '3 heures avant',
          oneDay: '1 jour avant',
          twoDays: '2 jours avant'
        }
      },
      notes: {
        title: 'Notes',
        subtitle: 'Organisez vos pensées',
        noNotes: 'Aucune note',
        noNotesInFolder: 'Aucune note dans ce dossier',
        createNote: 'Créer une note',
        editNote: 'Modifier la note',
        noteName: 'Titre de la note',
        content: 'Contenu',
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        createFolder: 'Créer un dossier',
        folderName: 'Nom du dossier',
        backToRoot: 'Retour',
        loading: 'Chargement des notes...',
        deleteConfirmation: 'Êtes-vous sûr de vouloir supprimer cette note?',
        deleteFolderConfirmation: 'Êtes-vous sûr de vouloir supprimer ce dossier?',
        deleteConfirmationTitle: 'Supprimer',
        root: 'Racine',
        selectFolder: 'Sélectionner un dossier',
        update: 'Mettre à jour',
        create: 'Créer',
        newNote: 'Nouvelle note',
        newFolder: 'Nouveau dossier',
        notesTitle: 'Notes',
        foldersTitle: 'Dossiers',
        notesInFolder: 'Notes dans ce dossier',
        edit: 'Modifier',
        noteDetails: 'Détails de la note',
        lastUpdated: 'Dernière mise à jour',
        addCheckbox: 'Ajouter une case à cocher',
        markdownHint: 'Les symboles spéciaux comme "- [ ]" s\'afficheront comme des cases à cocher'
      },
      reminders: {
        title: 'Rappels',
        subtitle: 'Gérez vos rappels',
        selectDate: 'Sélectionner une date',
        noReminders: 'Aucun rappel',
        noRemindersForDate: 'Aucun rappel pour cette date',
        createReminder: 'Créer un rappel',
        newReminder: 'Nouveau rappel',
        editReminder: 'Modifier le rappel',
        reminderTitle: 'Titre du rappel',
        date: 'Date',
        time: 'Heure',
        description: 'Description',
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        loading: 'Chargement des rappels...',
        deleteConfirmation: 'Êtes-vous sûr de vouloir supprimer ce rappel?',
        deleteConfirmationTitle: 'Supprimer le rappel',
        remindersFor: 'Rappels pour {{date}}',
        upcomingReminders: 'Rappels à venir',
        edit: 'Modifier',
        reminderDetails: 'Détails du rappel',
        recurringReminder: 'Rappel récurrent',
        selectDays: 'Sélectionner les jours',
        notificationTimes: 'Heures de notification',
        addNotificationTime: 'Ajouter une heure de notification',
        active: 'Actif',
        inactive: 'Inactif',
        openCalendar: 'Ouvrir le calendrier',
        filterAll: 'Tous',
        filterRecurring: 'Récurrents',
        filterNonRecurring: 'Ponctuels'
      },
      tasks: {
        title: 'Tâches quotidiennes',
        subtitle: 'Créez et suivez vos tâches',
        noTasks: 'Aucune tâche',
        createTask: 'Créer une tâche',
        editTask: 'Modifier la tâche',
        taskName: 'Nom de la tâche',
        description: 'Description',
        howManyDays: 'Combien de jours?',
        progress: 'Progression',
        days: 'jours',
        save: 'Enregistrer',
        create: 'Créer',
        creating: 'Création en cours...',
        cancel: 'Annuler',
        delete: 'Supprimer',
        reset: 'Réinitialiser',
        loading: 'Chargement des tâches...',
        deleteConfirmation: 'Êtes-vous sûr de vouloir supprimer cette tâche?',
        deleteConfirmationTitle: 'Supprimer la tâche',
        resetConfirmation: 'Êtes-vous sûr de vouloir réinitialiser la progression de "{taskName}"? Cela remettra votre progression à 0/{daysSelected} jours.',
        resetConfirmationTitle: 'Réinitialiser la tâche',
        noTasksYet: 'Aucune tâche pour le moment',
        createFirstTask: 'Créez votre première tâche pour commencer à prendre de bonnes habitudes'
      }
    }
  },
  en: {
    translation: {
      common: {
        at: 'at',
        on: 'on',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        loading: 'Loading...',
        today: 'Today',
        done: 'Done',
        day: 'Day',
        month: 'Month',
        year: 'Year',
        hour: 'Hour',
        minute: 'Minute'
      },
      navigation: {
        home: 'Home',
        tasks: 'Tasks',
        appointments: 'Appt',
        reminders: 'Remind',
        notes: 'Notes'
      },
      login: {
        title: 'PRONTO',
        subtitle: 'Your Personal Assistant',
        email: 'Email address',
        password: 'Password',
        login: 'Login',
        register: 'Create account',
        loginButton: 'Login',
        createAccount: 'Create account',
        forgotPassword: 'Forgot password?',
        privacyPolicy: 'Privacy Policy',
        termsOfUse: 'Terms of Use',
        selectMotivations: 'Select your motivations (max. 2)',
        invalidCredentials: 'Invalid email or password',
        selectLanguage: 'Select language',
        fieldsRequired: 'All fields are required',
        acceptTerms: 'Please accept the terms of use',
        selectMotivationsRequired: 'Please select at least one motivation',
        registrationError: 'An error occurred during registration',
        emailInUse: 'This email address is already in use',
        invalidEmail: 'Invalid email address',
        weakPassword: 'The password is too weak',
        termsAgreement: 'I accept the',
        and: 'and the'
      },
      home: {
        subtitle: 'Your Personal Assistant',
        todaySchedule: 'Today\'s Schedule',
        appointments: 'Appointments',
        reminders: 'Reminders',
        noUpcomingAppointments: 'No upcoming appointments',
        noReminders: 'No reminders',
        seeMore: 'See more...',
        showLess: 'Show less',
        seeAll: 'See all',
        schedule: 'Schedule',
        dailyTasks: 'Daily Tasks',
        noTasks: 'No tasks for today',
        loadingTasks: 'Loading tasks...',
        done: 'Done',
        days: 'days',
        appointmentDetails: 'Appointment Details',
        reminderDetails: 'Reminder Details',
        editAppointment: 'Edit Appointment',
        editReminder: 'Edit Reminder',
        notifications: 'Notifications',
        recurringOn: 'Recurring on:',
        menu: {
          activitySummary: 'Activity Summary',
          tasks: 'Tasks',
          appointments: 'Appointments',
          reminders: 'Reminders',
          accountInfo: 'Account Info',
          lastActivity: 'Last Activity:',
          language: 'Language:',
          motivations: 'Motivations:',
          appInfo: 'App Info',
          version: 'Version:',
          contactSupport: 'Contact Support',
          supportEmail: 'For any assistance, contact: prontoapp.info@gmail.com',
          editMotivations: 'Edit my motivations',
          logOut: 'Log Out'
        }
      },
      motivations: {
        sport: 'Sport',
        business: 'Business',
        studies: 'Studies',
        wellbeing: 'Well-being',
        parenting: 'Parenting',
        personalDevelopment: 'Personal Development',
        financialManagement: 'Financial Management'
      },
      onboarding: {
        notifications: {
          title: 'Stay informed',
          description: 'Enable notifications to not miss anything',
          features: {
            appointments: 'Appointment reminders',
            reminders: 'Custom notifications',
            tasks: 'Task tracking',
            motivation: 'Motivational messages',
            support: 'Personalized support'
          },
          allow: 'Enable notifications',
          note: 'You can change these settings later'
        },
        features: {
          title: 'Discover your features',
          subtitle: 'Here\'s what awaits you in your personal assistant',
          motivation: {
            title: 'Motivation',
            description: 'Receive personalized motivational messages based on your goals'
          },
          appointments: {
            title: 'Appointments',
            description: 'Easily manage all your important appointments'
          },
          reminders: {
            title: 'Reminders',
            description: 'Create custom reminders so you don\'t forget anything'
          },
          tasks: {
            title: 'Tasks',
            description: 'Track your daily and weekly tasks'
          },
          reports: {
            title: 'Reports',
            description: 'View your progress in detail'
          },
          examples: {
            title: 'Start by creating your daily tasks\n\nExample:',
            water: 'Drink more than 1L water per day',
            sport: 'Exercise regularly',
            meditation: 'Read a book',
            reading: 'Take care of yourself',
            healthy: 'Eat healthy'
          },
          continue: 'Continue'
        }
      },
      legal: {
        lastUpdated: 'Last updated: February 1, 2024',
        privacyContent: 'Privacy policy content...',
        termsContent: 'Terms of use content...'
      },
      appointments: {
        title: 'Appointments',
        subtitle: 'Manage your appointments',
        selectDate: 'Select date',
        noAppointments: 'No appointments',
        noAppointmentsForDate: 'No appointments for this date',
        createAppointment: 'Create appointment',
        editAppointment: 'Edit appointment',
        appointmentName: 'Appointment title',
        date: 'Date',
        startTime: 'Start time',
        endTime: 'End time',
        description: 'Description',
        address: 'Address',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        loading: 'Loading appointments...',
        deleteConfirmation: 'Are you sure you want to delete this appointment?',
        deleteConfirmationTitle: 'Delete appointment',
        appointmentsFor: 'Appointments for {{date}}',
        upcomingAppointments: 'Upcoming appointments',
        edit: 'Edit',
        appointmentDetails: 'Appointment details',
        notifications: 'Notifications',
        noNotifications: 'No notifications',
        selectNotifications: 'Select notifications',
        selectUpToThree: 'Select up to 3 reminders',
        notificationOptions: {
          fifteenMinutes: '15 minutes before',
          oneHour: '1 hour before',
          threeHours: '3 hours before',
          oneDay: '1 day before',
          twoDays: '2 days before'
        }
      },
      notes: {
        title: 'Notes',
        subtitle: 'Organize your thoughts',
        noNotes: 'No notes',
        noNotesInFolder: 'No notes in this folder',
        createNote: 'Create note',
        editNote: 'Edit note',
        noteName: 'Note title',
        content: 'Content',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        createFolder: 'Create folder',
        folderName: 'Folder name',
        backToRoot: 'Back',
        loading: 'Loading notes...',
        deleteConfirmation: 'Are you sure you want to delete this note?',
        deleteFolderConfirmation: 'Are you sure you want to delete this folder?',
        deleteConfirmationTitle: 'Delete',
        root: 'Root',
        selectFolder: 'Select folder',
        update: 'Update',
        create: 'Create',
        newNote: 'New Note',
        newFolder: 'New Folder',
        notesTitle: 'Notes',
        foldersTitle: 'Folders',
        notesInFolder: 'Notes in this folder',
        edit: 'Edit',
        noteDetails: 'Note Details',
        lastUpdated: 'Last updated',
        addCheckbox: 'Add Checkbox',
        markdownHint: 'Special symbols like "- [ ]" will display as proper checkboxes'
      },
      reminders: {
        title: 'Reminders',
        subtitle: 'Never miss what\'s important',
        openCalendar: 'Open Calendar',
        noReminders: 'No reminders',
        noRemindersForDay: 'No reminders for {{date}}',
        createReminder: 'Create reminder',
        editReminder: 'Edit reminder',
        newReminder: 'New Reminder',
        reminderTitle: 'Reminder title',
        date: 'Date',
        time: 'Time',
        recurringReminder: 'Recurring reminder?',
        selectDays: 'Select days',
        notificationTimes: 'Notification times',
        addNotificationTime: 'Add notification time',
        active: 'Active',
        inactive: 'Inactive',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        loading: 'Loading reminders...',
        deleteConfirmation: 'Are you sure you want to delete this reminder?',
        deleteConfirmationTitle: 'Delete reminder',
        daysOfWeek: {
          sunday: 'Sun',
          monday: 'Mon',
          tuesday: 'Tue',
          wednesday: 'Wed',
          thursday: 'Thu',
          friday: 'Fri',
          saturday: 'Sat'
        },
        remindersFor: 'Reminders for {{date}}',
        filterAll: 'All',
        filterRecurring: 'Recurring',
        filterNonRecurring: 'One-time'
      },
      tasks: {
        title: 'Daily Tasks',
        subtitle: 'Create and track your tasks',
        noTasks: 'No tasks',
        createTask: 'Create task',
        editTask: 'Edit task',
        taskName: 'Task name',
        description: 'Description',
        howManyDays: 'How many days?',
        progress: 'Progress',
        days: 'days',
        save: 'Save',
        create: 'Create',
        creating: 'Creating...',
        cancel: 'Cancel',
        delete: 'Delete',
        reset: 'Reset',
        loading: 'Loading tasks...',
        deleteConfirmation: 'Are you sure you want to delete this task?',
        deleteConfirmationTitle: 'Delete task',
        resetConfirmation: 'Are you sure you want to reset progress for "{taskName}"? This will set your progress back to 0/{daysSelected} days.',
        resetConfirmationTitle: 'Reset task',
        noTasksYet: 'No tasks yet',
        createFirstTask: 'Create your first task to start building healthy habits'
      }
    }
  },
  nl: {
    translation: {
      common: {
        at: 'om',
        on: 'op',
        yes: 'Ja',
        no: 'Nee',
        ok: 'OK',
        cancel: 'Annuleren',
        save: 'Opslaan',
        delete: 'Verwijderen',
        edit: 'Bewerken',
        create: 'Aanmaken',
        loading: 'Laden...',
        today: 'Vandaag',
        done: 'Klaar',
        day: 'Dag',
        month: 'Maand',
        year: 'Jaar',
        hour: 'Uur',
        minute: 'Minuut'
      },
      navigation: {
        home: 'Home',
        tasks: 'Taken',
        appointments: 'Afsprk',
        reminders: 'Herinn',
        notes: 'Notities'
      },
      login: {
        title: 'PRONTO',
        subtitle: 'Uw Persoonlijke Assistent',
        email: 'E-mailadres',
        password: 'Wachtwoord',
        login: 'Inloggen',
        register: 'Account aanmaken',
        loginButton: 'Inloggen',
        createAccount: 'Account aanmaken',
        forgotPassword: 'Wachtwoord vergeten?',
        privacyPolicy: 'Privacybeleid',
        termsOfUse: 'Gebruiksvoorwaarden',
        selectMotivations: 'Selecteer uw motivaties (max. 2)',
        invalidCredentials: 'Ongeldig e-mailadres of wachtwoord',
        selectLanguage: 'Selecteer taal',
        fieldsRequired: 'Alle velden zijn verplicht',
        acceptTerms: 'Accepteer de gebruiksvoorwaarden',
        selectMotivationsRequired: 'Selecteer ten minste één motivatie',
        registrationError: 'Er is een fout opgetreden bij het registreren',
        emailInUse: 'Dit e-mailadres is al in gebruik',
        invalidEmail: 'Ongeldig e-mailadres',
        weakPassword: 'Het wachtwoord is te zwak',
        termsAgreement: 'Ik ga akkoord met het',
        and: 'en de'
      },
      motivations: {
        sport: 'Sport',
        business: 'Zakelijk',
        studies: 'Studies',
        wellbeing: 'Welzijn',
        parenting: 'Ouderschap',
        personalDevelopment: 'Persoonlijke Ontwikkeling',
        financialManagement: 'Financieel Beheer'
      },
      onboarding: {
        notifications: {
          title: 'Blijf op de hoogte',
          description: 'Activeer meldingen om niets te missen',
          features: {
            appointments: 'Afspraakherinneringen',
            reminders: 'Aangepaste meldingen',
            tasks: 'Taakopvolging',
            motivation: 'Motiverende berichten',
            support: 'Persoonlijke ondersteuning'
          },
          allow: 'Meldingen activeren',
          note: 'U kunt deze instellingen later wijzigen'
        },
        features: {
          title: 'Ontdek uw functies',
          subtitle: 'Dit is wat u kunt verwachten van uw persoonlijke assistent',
          motivation: {
            title: 'Motivatie',
            description: 'Ontvang gepersonaliseerde motiverende berichten'
          },
          appointments: {
            title: 'Afspraken',
            description: 'Beheer al uw belangrijke afspraken'
          },
          reminders: {
            title: 'Herinneringen',
            description: 'Maak aangepaste herinneringen'
          },
          tasks: {
            title: 'Taken',
            description: 'Volg uw dagelijkse en wekelijkse taken'
          },
          reports: {
            title: 'Rapporten',
            description: 'Bekijk uw voortgang in detail'
          },
          examples: {
            title: 'Begin met het maken van uw dagelijkse taken\n\nVoorbeeld:',
            water: 'Drink meer dan 1L water per dag',
            sport: 'Beweeg regelmatig',
            meditation: 'Lees een boek',
            reading: 'Zorg goed voor jezelf',
            healthy: 'Eet gezond'
          },
          continue: 'Doorgaan'
        }
      },
      legal: {
        lastUpdated: 'Laatst bijgewerkt: 1 februari 2024',
        privacyContent: 'Inhoud privacybeleid...',
        termsContent: 'Inhoud gebruiksvoorwaarden...'
      },
      appointments: {
        title: 'Afspraken',
        subtitle: 'Beheer uw afspraken',
        selectDate: 'Selecteer datum',
        noAppointments: 'Geen afspraken',
        noAppointmentsForDate: 'Geen afspraken voor deze datum',
        createAppointment: 'Afspraak maken',
        editAppointment: 'Afspraak wijzigen',
        appointmentName: 'Afspraaktitel',
        date: 'Datum',
        startTime: 'Begintijd',
        endTime: 'Eindtijd',
        description: 'Beschrijving',
        address: 'Adres',
        save: 'Opslaan',
        cancel: 'Annuleren',
        delete: 'Verwijderen',
        loading: 'Afspraken laden...',
        deleteConfirmation: 'Weet u zeker dat u deze afspraak wilt verwijderen?',
        deleteConfirmationTitle: 'Afspraak verwijderen',
        appointmentsFor: 'Afspraken voor {{date}}',
        upcomingAppointments: 'Aankomende afspraken',
        edit: 'Wijzigen',
        appointmentDetails: 'Afspraakdetails',
        notifications: 'Notificaties',
        noNotifications: 'Geen notificaties',
        selectNotifications: 'Selecteer notificaties',
        selectUpToThree: 'Selecteer maximaal 3 herinneringen',
        notificationOptions: {
          fifteenMinutes: '15 minuten vooraf',
          oneHour: '1 uur vooraf',
          threeHours: '3 uur vooraf',
          oneDay: '1 dag vooraf',
          twoDays: '2 dagen vooraf'
        }
      },
      notes: {
        title: 'Notities',
        subtitle: 'Organiseer uw gedachten',
        noNotes: 'Geen notities',
        noNotesInFolder: 'Geen notities in deze map',
        createNote: 'Notitie maken',
        editNote: 'Notitie bewerken',
        noteName: 'Notitietitel',
        content: 'Inhoud',
        save: 'Opslaan',
        cancel: 'Annuleren',
        delete: 'Verwijderen',
        createFolder: 'Map maken',
        folderName: 'Mapnaam',
        backToRoot: 'Terug',
        loading: 'Notities laden...',
        deleteConfirmation: 'Weet u zeker dat u deze notitie wilt verwijderen?',
        deleteFolderConfirmation: 'Weet u zeker dat u deze map wilt verwijderen?',
        deleteConfirmationTitle: 'Verwijderen',
        root: 'Hoofdmap',
        selectFolder: 'Map selecteren',
        update: 'Bijwerken',
        create: 'Maken',
        newNote: 'Nieuwe notitie',
        newFolder: 'Nieuwe map',
        notesTitle: 'Notities',
        foldersTitle: 'Mappen',
        notesInFolder: 'Notities in deze map',
        edit: 'Bewerken',
        noteDetails: 'Notitie details',
        lastUpdated: 'Laatst bijgewerkt',
        addCheckbox: 'Checkbox toevoegen',
        markdownHint: 'Speciale symbolen zoals "- [ ]" worden weergegeven als echte checkboxes'
      },
      reminders: {
        title: 'Herinneringen',
        subtitle: 'Mis nooit meer iets belangrijks',
        openCalendar: 'Kalender openen',
        noReminders: 'Geen herinneringen',
        noRemindersForDay: 'Geen herinneringen voor {{date}}',
        createReminder: 'Herinnering maken',
        editReminder: 'Herinnering bewerken',
        newReminder: 'Nieuwe herinnering',
        reminderTitle: 'Herinneringstitel',
        date: 'Datum',
        time: 'Tijd',
        recurringReminder: 'Terugkerende herinnering?',
        selectDays: 'Dagen selecteren',
        notificationTimes: 'Notificatietijden',
        addNotificationTime: 'Notificatietijd toevoegen',
        active: 'Actief',
        inactive: 'Inactief',
        save: 'Opslaan',
        cancel: 'Annuleren',
        delete: 'Verwijderen',
        edit: 'Bewerken',
        loading: 'Herinneringen laden...',
        deleteConfirmation: 'Weet u zeker dat u deze herinnering wilt verwijderen?',
        deleteConfirmationTitle: 'Herinnering verwijderen',
        daysOfWeek: {
          sunday: 'Zo',
          monday: 'Ma',
          tuesday: 'Di',
          wednesday: 'Wo',
          thursday: 'Do',
          friday: 'Vr',
          saturday: 'Za'
        },
        remindersFor: 'Herinneringen voor {{date}}'
      },
      tasks: {
        title: 'Dagelijkse Taken',
        subtitle: 'Maak en volg uw taken',
        noTasks: 'Geen taken',
        createTask: 'Taak aanmaken',
        editTask: 'Taak bewerken',
        taskName: 'Taaknaam',
        description: 'Beschrijving',
        howManyDays: 'Hoeveel dagen?',
        progress: 'Voortgang',
        days: 'dagen',
        save: 'Opslaan',
        create: 'Aanmaken',
        creating: 'Aanmaken...',
        cancel: 'Annuleren',
        delete: 'Verwijderen',
        reset: 'Resetten',
        loading: 'Taken laden...',
        deleteConfirmation: 'Weet u zeker dat u deze taak wilt verwijderen?',
        deleteConfirmationTitle: 'Taak verwijderen',
        resetConfirmation: 'Weet u zeker dat u de voortgang van "{taskName}" wilt resetten? Dit zal uw voortgang terugzetten naar 0/{daysSelected} dagen.',
        resetConfirmationTitle: 'Taak resetten',
        noTasksYet: 'Nog geen taken',
        createFirstTask: 'Maak uw eerste taak om gezonde gewoonten te ontwikkelen'
      }
    }
  },
  es: {
    translation: {
      common: {
        day: 'Día',
        month: 'Mes',
        year: 'Año',
        hour: 'Hora',
        minute: 'Minuto'
      },
      notes: {
        markdownHint: 'Los símbolos especiales como "- [ ]" se mostrarán como casillas de verificación'
      }
    },
  },
  pt: {
    translation: {
      common: {
        day: 'Dia',
        month: 'Mês',
        year: 'Ano',
        hour: 'Hora',
        minute: 'Minuto'
      },
      notes: {
        markdownHint: 'Símbolos especiais como "- [ ]" serão exibidos como caixas de seleção'
      }
    },
  },
  it: {
    translation: {
      common: {
        day: 'Giorno',
        month: 'Mese',
        year: 'Anno',
        hour: 'Ora',
        minute: 'Minuto'
      },
      notes: {
        markdownHint: 'Simboli speciali come "- [ ]" verranno visualizzati come caselle di controllo'
      }
    },
  }
};

let isInitialized = false;

export const saveLanguagePreference = async (lang: SupportedLanguage) => {
  try {
    await AsyncStorage.setItem('userLanguage', lang);
    if (isInitialized) {
      await i18n.changeLanguage(lang);
    }
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
};

export const initI18n = async () => {
  try {
    if (isInitialized) {
      return i18n;
    }

    const savedLanguage = await AsyncStorage.getItem('userLanguage');
    const deviceLanguage = Localization.locale.split('-')[0];
    const initialLanguage = savedLanguage || 
      (deviceLanguage in SUPPORTED_LANGUAGES ? deviceLanguage : 'fr');

    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: initialLanguage,
        fallbackLng: 'fr',
        interpolation: {
          escapeValue: false
        },
        compatibilityJSON: 'v3'
      });

    isInitialized = true;
    return i18n;
  } catch (error) {
    console.error('Error initializing i18n:', error);
    throw error;
  }
};

export default i18n;