import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { ChevronDown } from 'lucide-react-native';

const MOTIVATION_CATEGORIES = [
  'Sport',
  'Business',
  'Studies',
  'Well-being',
  'Parenting',
  'Personal Development',
  'Financial Management'
] as const;

type MotivationCategory = typeof MOTIVATION_CATEGORIES[number];

export default function Login() {
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedMotivations, setSelectedMotivations] = useState<MotivationCategory[]>([]);
  const [showMotivationPicker, setShowMotivationPicker] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(t('login.invalidCredentials'));
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

  return (
    <LinearGradient
      colors={['#4c1d95', '#7c3aed']}
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
                onPress={() => {
                  // Language selection logic
                }}
              >
                <Text style={styles.languageSelectorText}>
                  {i18n.language.toUpperCase()}
                </Text>
                <ChevronDown size={20} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.motivationSelector}
                onPress={() => setShowMotivationPicker(!showMotivationPicker)}
              >
                <Text style={styles.motivationSelectorText}>
                  {selectedMotivations.length > 0
                    ? selectedMotivations.join(', ')
                    : t('login.selectMotivations')}
                </Text>
                <ChevronDown size={20} color="#ffffff" />
              </TouchableOpacity>

              {showMotivationPicker && (
                <View style={styles.motivationList}>
                  {MOTIVATION_CATEGORIES.map(category => (
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
                        {category}
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
            onPress={isLogin ? handleLogin : () => {}}
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

        <View style={styles.footer}>
          <Link href="/privacy-policy" style={styles.footerLink}>
            <Text style={styles.footerLinkText}>{t('login.privacyPolicy')}</Text>
          </Link>
          <Link href="/terms" style={styles.footerLink}>
            <Text style={styles.footerLinkText}>{t('login.termsOfUse')}</Text>
          </Link>
        </View>
      </View>
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
    backgroundColor: '#ffffff',
  },
  toggleText: {
    color: '#e4e4e7',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
  },
  toggleTextActive: {
    color: '#4c1d95',
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    gap: 4,
  },
  motivationItem: {
    padding: 12,
    borderRadius: 8,
  },
  motivationItemSelected: {
    backgroundColor: '#4c1d95',
  },
  motivationItemText: {
    color: '#1f2937',
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
    backgroundColor: '#f97316',
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
    color: '#e4e4e7',
    fontFamily: 'Inter-Regular',
  },
  error: {
    color: '#ef4444',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 32,
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