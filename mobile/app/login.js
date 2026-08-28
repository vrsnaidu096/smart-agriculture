import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, firebaseConfig } from '../services/firebase';
import { setToken } from '../services/storage';
import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const recaptchaVerifier = useRef(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if (!phoneNumber.startsWith('+')) {
      Alert.alert('Error', 'Please enter a valid phone number with country code (e.g., +91).');
      return;
    }
    setLoading(true);
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        phoneNumber,
        recaptchaVerifier.current
      );
      setVerificationId(verificationId);
      Alert.alert('OTP Sent', 'A verification code has been sent to your phone.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setLoading(false);
  };

  const confirmOTP = async () => {
    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      const userCredential = await signInWithCredential(auth, credential);
      
      // Get the Firebase JWT Token
      const token = await userCredential.user.getIdToken();
      
      // Save it securely in Expo SecureStore so api.js can use it
      await setToken(token);
      
      // Navigate to Home
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Error', 'Invalid OTP code.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        attemptInvisibleVerification={true}
      />
      <View style={styles.content}>
        <Text style={styles.title}>Smart Agriculture</Text>
        <Text style={styles.subtitle}>Log in or register to secure your farm data.</Text>

        {!verificationId ? (
          <>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 9876543210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              autoComplete="tel"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
            <TouchableOpacity 
              style={[styles.button, loading && styles.disabled]} 
              onPress={sendOTP} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Enter 6-Digit Code</Text>
            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={verificationCode}
              onChangeText={setVerificationCode}
              maxLength={6}
            />
            <TouchableOpacity 
              style={[styles.button, loading && styles.disabled]} 
              onPress={confirmOTP} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Verify and Log In</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center' },
  title: { ...typography.heading, fontSize: 32, marginBottom: spacing.sm, color: colors.primary },
  subtitle: { ...typography.bodySecondary, marginBottom: spacing.xxl },
  label: { ...typography.body, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.lg
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center'
  },
  buttonText: { ...typography.button },
  disabled: { opacity: 0.7 }
});
