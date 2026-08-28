import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, radius, typography } from '../theme';
import { useTranslation } from '../i18n';

const MAX_PHOTOS = 4;

export default function ScanScreen({ navigation }) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef(null);

  const takePicture = async () => {
    if (!cameraRef.current || !ready || capturing || photos.length >= MAX_PHOTOS) return;
    setCapturing(true);
    try {
      // quality 0.7 keeps the base64 payload small enough for the analyze call.
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: true });
      setPhotos((current) => [...current, photo]);
    } catch (error) {
      console.warn('[scan] capture failed:', error.message);
    } finally {
      setCapturing(false);
    }
  };

  const pickImage = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos((current) => [...current, result.assets[0]]);
      }
    } catch (error) {
      console.warn('[scan] gallery selection failed:', error.message);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionWrap}>
        <Ionicons name="camera-outline" size={48} color={colors.primary} />
        <Text style={styles.permissionTitle}>{t('permission_camera')}</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.85}>
          <Text style={styles.permissionButtonText}>{t('grant_permission')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>{t('cancel')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        ref={cameraRef}
        onCameraReady={() => setReady(true)}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.roundButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.hint}>{t('position_leaf')}</Text>
          <TouchableOpacity style={styles.roundButton} onPress={pickImage} disabled={photos.length >= MAX_PHOTOS}>
            <Ionicons name="images-outline" size={20} color={photos.length >= MAX_PHOTOS ? 'rgba(255,255,255,0.4)' : colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.frameArea}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.counter}>{t('photos_captured', { count: photos.length })}</Text>
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.thumbRow}>
            {photos.map((photo, index) => (
              <Image key={index} source={{ uri: photo.uri }} style={styles.thumb} />
            ))}
          </View>

          <View style={styles.controlRow}>
            <TouchableOpacity
              style={styles.sideButton}
              onPress={() => setPhotos([])}
              disabled={photos.length === 0}
            >
              <Text style={[styles.sideText, photos.length === 0 && styles.disabledText]}>
                {t('clear_all')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shutter, photos.length >= MAX_PHOTOS && styles.shutterDisabled]}
              onPress={takePicture}
              disabled={photos.length >= MAX_PHOTOS || capturing}
              activeOpacity={0.8}
            >
              {capturing ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sideButton}
              onPress={() => navigation.navigate('Preview', { photos })}
              disabled={photos.length === 0}
            >
              <Text style={[styles.sideText, styles.next, photos.length === 0 && styles.disabledText]}>
                {t('preview')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md
  },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hint: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    overflow: 'hidden'
  },
  frameArea: { alignItems: 'center', gap: spacing.lg },
  frame: { width: 250, height: 250 },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: colors.white, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 10 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 10 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 10 },
  counter: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    overflow: 'hidden'
  },
  bottomBar: { paddingBottom: spacing.lg, gap: spacing.lg },
  thumbRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, minHeight: 52 },
  thumb: { width: 52, height: 52, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.white },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl },
  sideButton: { width: 76, alignItems: 'center' },
  sideText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  next: { color: colors.accent, fontWeight: '700' },
  disabledText: { opacity: 0.35 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  shutterDisabled: { opacity: 0.4 },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.white },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.lg
  },
  permissionTitle: { ...typography.subheading, textAlign: 'center' },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md
  },
  permissionButtonText: { ...typography.button, fontSize: 15 },
  cancel: { ...typography.bodySecondary }
});
