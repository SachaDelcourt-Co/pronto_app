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
      }
    }
  },
  nl: {
    translation: {
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
      }
    }
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