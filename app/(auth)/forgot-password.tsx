import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { ArrowLeft, Mail } from 'lucide-react-native';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleResetPassword = async () => {
    if (!email) {
      setError(t('forgotPassword.emailRequired'));
      return;
    }

    try {
      setStatus('loading');
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(t('forgotPassword.error'));
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2a1a2a']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Mail size={48} color="#9333ea" />
        </View>

        <Text style={styles.title}>{t('forgotPassword.title')}</Text>
        <Text style={styles.description}>{t('forgotPassword.description')}</Text>

        {status === 'success' ? (
          <View style={styles.successContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1526280760714-f9e8b26f318f?w=800&auto=format&fit=crop&q=80' }}
              style={styles.successImage}
            />
            <Text style={styles.successTitle}>{t('forgotPassword.emailSent')}</Text>
            <Text style={styles.successText}>{t('forgotPassword.checkEmail')}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>{t('forgotPassword.backToLogin')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
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
              editable={status !== 'loading'}
            />

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, status === 'loading' && styles.buttonLoading]}
              onPress={handleResetPassword}
              disabled={status === 'loading'}
            >
              <Text style={styles.buttonText}>
                {status === 'loading' 
                  ? t('forgotPassword.sending')
                  : t('forgotPassword.sendLink')
                }
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: 400,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
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
    marginTop: 16,
  },
  buttonLoading: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  successContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
});