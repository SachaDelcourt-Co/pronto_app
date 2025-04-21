import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ScrollView, Modal } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ChevronDown, Check } from 'lucide-react-native';
import { SUPPORTED_LANGUAGES, type SupportedLanguage, saveLanguagePreference } from '@/utils/i18n';
import { DatabaseService } from '@/services/database';

const MOTIVATION_CATEGORIES = [
  'sport',
  'business',
  'studies',
  'wellbeing',
  'parenting',
  'personalDevelopment',
  'financialManagement'
] as const;

type MotivationCategory = typeof MOTIVATION_CATEGORIES[number];

export default function Login() {
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedMotivations, setSelectedMotivations] = useState<MotivationCategory[]>([]);
  const [showMotivationPicker, setShowMotivationPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setError('');
    setEmail('');
    setPassword('');
    setTermsAccepted(false);
    setSelectedMotivations([]);
  }, [isLogin]);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError(t('login.fieldsRequired'));
      return;
    }
    
    try {
      setIsLoading(true);
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/blank');
    } catch (err) {
      setError(t('login.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setError('');
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
      setIsLoading(true);
      const auth = getAuth();
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in database
      await DatabaseService.createUser({
        email: user.email!,
        name: '',
        language: i18n.language as SupportedLanguage,
        motivations: selectedMotivations,
      });

      // Navigate to onboarding flow
      router.push('/onboarding/notifications');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError(t('login.emailInUse'));
      } else if (err.code === 'auth/invalid-email') {
        setError(t('login.invalidEmail'));
      } else if (err.code === 'auth/weak-password') {
        setError(t('login.weakPassword'));
      } else {
        setError(t('login.registrationError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMotivation = (category: MotivationCategory) => {
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

  const changeLanguage = async (lang: SupportedLanguage) => {
    try {
      await saveLanguagePreference(lang);
      setShowLanguagePicker(false);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  // Split motivation categories into two columns
  const leftColumnMotivations = MOTIVATION_CATEGORIES.slice(0, Math.ceil(MOTIVATION_CATEGORIES.length / 2));
  const rightColumnMotivations = MOTIVATION_CATEGORIES.slice(Math.ceil(MOTIVATION_CATEGORIES.length / 2));

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2a1a2a']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{t('login.title')}</Text>
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
                  {SUPPORTED_LANGUAGES[i18n.language as SupportedLanguage]}
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
                  <View style={styles.motivationColumns}>
                    <View style={styles.motivationColumn}>
                      {leftColumnMotivations.map(category => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.motivationItem,
                            selectedMotivations.includes(category) && styles.motivationItemSelected
                          ]}
                          onPress={() => toggleMotivation(category)}
                        >
                          <Text style={[
                            styles.motivationItemText,
                            selectedMotivations.includes(category) && styles.motivationItemTextSelected
                          ]}>
                            {t(`motivations.${category}`)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.motivationColumn}>
                      {rightColumnMotivations.map(category => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.motivationItem,
                            selectedMotivations.includes(category) && styles.motivationItemSelected
                          ]}
                          onPress={() => toggleMotivation(category)}
                        >
                          <Text style={[
                            styles.motivationItemText,
                            selectedMotivations.includes(category) && styles.motivationItemTextSelected
                          ]}>
                            {t(`motivations.${category}`)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder={t('login.email')}
            placeholderTextColor="#666666"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder={t('login.password')}
            placeholderTextColor="#666666"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            secureTextEntry
          />

          {!isLogin && (
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => {
                setTermsAccepted(!termsAccepted);
                setError('');
              }}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Check size={16} color="#ffffff" />}
              </View>
              <Text style={styles.termsText}>
                {t('login.termsAgreement')}{' '}
                <Link href="/privacy-policy" style={styles.termsLink}>
                  <Text style={styles.termsLinkText}>{t('login.privacyPolicy')}</Text>
                </Link>
                {' '}{t('login.and')}{' '}
                <Link href="/terms" style={styles.termsLink}>
                  <Text style={styles.termsLinkText}>{t('login.termsOfUse')}</Text>
                </Link>
              </Text>
            </TouchableOpacity>
          )}

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonLoading]}
            onPress={isLogin ? handleLogin : handleCreateAccount}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLogin ? t('login.loginButton') : t('login.createAccount')}
            </Text>
          </TouchableOpacity>

          {isLogin && (
            <Link href="/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotPasswordButton}>
                <Text style={styles.forgotPasswordText}>
                  {t('login.forgotPassword')}
                </Text>
              </TouchableOpacity>
            </Link>
          )}
        </View>
      </View>

      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('login.selectLanguage')}</Text>
            {(Object.entries(SUPPORTED_LANGUAGES) as [SupportedLanguage, string][]).map(([code, name]) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.languageOption,
                  code === i18n.language && styles.languageOptionSelected
                ]}
                onPress={() => changeLanguage(code)}
              >
                <Text style={[
                  styles.languageOptionText,
                  code === i18n.language && styles.languageOptionTextSelected
                ]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === 'web' ? 40 : 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 36,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#9333ea',
  },
  toggleText: {
    color: '#999999',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  form: {
    gap: 12,
  },
  languageSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageSelectorText: {
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
  motivationSelector: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
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
  },
  motivationColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  motivationColumn: {
    flex: 1,
    gap: 8,
  },
  motivationItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  motivationItemSelected: {
    backgroundColor: '#9333ea',
  },
  motivationItemText: {
    color: '#999999',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
  },
  motivationItemTextSelected: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9333ea',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#9333ea',
  },
  termsText: {
    flex: 1,
    color: '#999999',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    padding: 0,
  },
  termsLinkText: {
    color: '#9333ea',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  errorText: {
    color: '#ef4444',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#9333ea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    padding: 12,
  },
  forgotPasswordText: {
    color: '#9333ea',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a1a2a',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
    textAlign: 'center',
  },
  languageOption: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  languageOptionSelected: {
    backgroundColor: '#9333ea',
  },
  languageOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  languageOptionTextSelected: {
    fontFamily: 'Inter-SemiBold',
  },
});