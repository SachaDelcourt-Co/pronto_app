import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Modal, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ChevronDown, X, Check } from 'lucide-react-native';
import { saveLanguagePreference, SUPPORTED_LANGUAGES, SupportedLanguage } from '@/utils/i18n';
import { DatabaseService } from '@/services/database';
import { User } from '@/types/database';

// Motivation categories directly map to database values
const MOTIVATION_CATEGORIES: { [key: string]: 'sport' | 'business' | 'studies' | 'wellbeing' | 'parenting' | 'personalDevelopment' | 'financialManagement' } = {
  'sport': 'sport',
  'business': 'business',
  'studies': 'studies',
  'wellbeing': 'wellbeing',
  'parenting': 'parenting',
  'personalDevelopment': 'personalDevelopment',
  'financialManagement': 'financialManagement'
};

type MotivationCategoryDB = keyof typeof MOTIVATION_CATEGORIES;

export default function Login() {
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedMotivations, setSelectedMotivations] = useState<MotivationCategoryDB[]>([]);
  const [showMotivationPicker, setShowMotivationPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleLogin = async () => {
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(t('login.invalidCredentials'));
    }
  };

  const handleSignup = async () => {
    setError('');
    
    // Form validation
    if (!email || !password) {
      setError(t('login.fieldsRequired'));
      return;
    }
    
    if (!termsAccepted) {
      setError(t('login.acceptTerms'));
      return;
    }
    
    if (selectedMotivations.length === 0) {
      setError(t('login.selectMotivationsRequired'));
      return;
    }
    
    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // No need to map motivations since they're already in the correct DB format
      
      // Create user profile in database
      try {
        // The DatabaseService.createUser expects parameters without userID and createdAt
        await DatabaseService.createUser({
          email,
          name: email.split('@')[0], // Default name from email
          motivations: selectedMotivations as ('sport' | 'business' | 'studies' | 'wellbeing' | 'parenting' | 'personalDevelopment' | 'financialManagement')[],
          language: i18n.language as SupportedLanguage,
        });
        
        router.replace('/onboarding/notifications');
      } catch (dbError) {
        console.error('Error creating user profile:', dbError);
        setError(t('login.registrationError'));
      }
    } catch (authError: any) {
      console.error('Auth error:', authError);
      
      // Handle specific error codes
      if (authError.code === 'auth/email-already-in-use') {
        setError(t('login.emailInUse'));
      } else if (authError.code === 'auth/invalid-email') {
        setError(t('login.invalidEmail'));
      } else if (authError.code === 'auth/weak-password') {
        setError(t('login.weakPassword'));
      } else {
        setError(t('login.registrationError'));
      }
    }
  };

  const toggleMotivation = (category: MotivationCategoryDB) => {
    setSelectedMotivations(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      if (prev.length < 2) {
        return [...prev, category];
      }
      return prev;
    });
  };

  const toggleTermsAccepted = () => {
    setTermsAccepted(!termsAccepted);
  };

  const changeLanguage = async (lang: string) => {
    await saveLanguagePreference(lang as SupportedLanguage);
    setShowLanguagePicker(false);
  };

  const renderLanguagePicker = () => {
    return (
      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('login.selectLanguage')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLanguagePicker(false)}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.languageOptions}>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  i18n.language === 'fr' && styles.languageOptionSelected
                ]}
                onPress={() => changeLanguage('fr')}
              >
                <Text style={styles.languageOptionText}>
                  {SUPPORTED_LANGUAGES.fr}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  i18n.language === 'en' && styles.languageOptionSelected
                ]}
                onPress={() => changeLanguage('en')}
              >
                <Text style={styles.languageOptionText}>
                  {SUPPORTED_LANGUAGES.en}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2a1a2a']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>PRONTO</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
              {t('login.login')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
              {t('login.register')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <>
              <TouchableOpacity
                style={styles.languageSelector}
                onPress={() => setShowLanguagePicker(true)}
              >
                <Text style={styles.languageSelectorText}>
                  {i18n.language === 'fr' ? SUPPORTED_LANGUAGES.fr : SUPPORTED_LANGUAGES.en}
                </Text>
                <ChevronDown size={20} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.motivationSelector}
                onPress={() => setShowMotivationPicker(!showMotivationPicker)}
              >
                <Text style={styles.motivationSelectorText}>
                  {selectedMotivations.length > 0
                    ? selectedMotivations.map(m => t(`motivations.${m}`)).join(', ')
                    : t('login.selectMotivations')}
                </Text>
                <ChevronDown size={20} color="#ffffff" />
              </TouchableOpacity>

              {showMotivationPicker && (
                <View style={styles.motivationList}>
                  {Object.keys(MOTIVATION_CATEGORIES).map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.motivationItem,
                        selectedMotivations.includes(category as MotivationCategoryDB) && styles.motivationItemSelected
                      ]}
                      onPress={() => toggleMotivation(category as MotivationCategoryDB)}
                    >
                      <Text style={[
                        styles.motivationItemText,
                        selectedMotivations.includes(category as MotivationCategoryDB) && styles.motivationItemTextSelected
                      ]}>
                        {t(`motivations.${category}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder={t('login.email')}
            placeholderTextColor="#a1a1aa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder={t('login.password')}
            placeholderTextColor="#a1a1aa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity 
            style={styles.button}
            onPress={isLogin ? handleLogin : handleSignup}
          >
            <Text style={styles.buttonText}>
              {isLogin ? t('login.loginButton') : t('login.createAccount')}
            </Text>
          </TouchableOpacity>

          {isLogin && (
            <Link href="/forgot-password" style={styles.link}>
              <Text style={styles.linkText}>{t('login.forgotPassword')}</Text>
            </Link>
          )}
        </View>

        {!isLogin && (
          <View style={styles.termsContainer}>
            <TouchableOpacity 
              style={styles.checkbox}
              onPress={toggleTermsAccepted}
            >
              {termsAccepted && <Check size={16} color="#9333ea" />}
            </TouchableOpacity>
            <Text style={styles.termsText}>
              {t('login.termsAgreement')}{' '}
              <Link href="/privacy-policy" style={styles.termsLink}>
                <Text style={styles.termsLinkText}>{t('login.privacyPolicy')}</Text>
              </Link>{' '}
              {t('login.and')}{' '}
              <Link href="/terms" style={styles.termsLink}>
                <Text style={styles.termsLinkText}>{t('login.termsOfUse')}</Text>
              </Link>
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Link href="/privacy-policy" style={styles.footerLink}>
            <Text style={styles.footerLinkText}>{t('login.privacyPolicy')}</Text>
          </Link>
          <Link href="/terms" style={styles.footerLink}>
            <Text style={styles.footerLinkText}>{t('login.termsOfUse')}</Text>
          </Link>
        </View>
      </View>

      {renderLanguagePicker()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 60 : 40,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 48,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    color: '#e4e4e7',
    textAlign: 'center',
    marginBottom: 48,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#9333ea',
  },
  toggleText: {
    color: '#e4e4e7',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  form: {
    gap: 16,
  },
  languageSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageSelectorText: {
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '80%',
    maxWidth: 400,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageOptions: {
    gap: 8,
  },
  languageOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  languageOptionSelected: {
    backgroundColor: '#9333ea',
  },
  languageOptionText: {
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  motivationSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  motivationSelectorText: {
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
  motivationList: {
    backgroundColor: '#2a1a2a',
    borderRadius: 12,
    padding: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  motivationItem: {
    padding: 12,
    borderRadius: 8,
  },
  motivationItemSelected: {
    backgroundColor: '#9333ea',
  },
  motivationItemText: {
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
  motivationItemTextSelected: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
  button: {
    backgroundColor: '#9333ea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  link: {
    alignItems: 'center',
    padding: 8,
  },
  linkText: {
    color: '#9333ea',
    fontFamily: 'Inter-Regular',
  },
  error: {
    color: '#ef4444',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9333ea',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    color: '#e4e4e7',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    
  },
  termsLinkText: {
    color: '#9333ea',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 32,
    marginBottom: 20,
  },
  footerLink: {
    padding: 8,
  },
  footerLinkText: {
    color: '#e4e4e7',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
});