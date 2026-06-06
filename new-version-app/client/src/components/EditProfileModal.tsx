import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator, Alert, Image, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { C, R, F } from '../theme';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { validateDisplayName, validateAvatarFile } from '../utils/validation';
import { ASSETS } from '../assets';

interface Props {
  visible: boolean;
  currentName: string;
  currentAvatarUrl: string | null;
  onClose: () => void;
  onSaved: (newName: string, newAvatarUrl: string | null) => void;
}

export default function EditProfileModal({
  visible, currentName, currentAvatarUrl, onClose, onSaved,
}: Props) {
  const { user, updateProfile } = useAuth();

  const [name, setName]             = useState(currentName);
  const [nameError, setNameError]   = useState('');
  const [avatarUri, setAvatarUri]   = useState<string | null>(currentAvatarUrl);
  // base64 payload of a freshly picked image (null when unchanged/removed).
  // Uploading via base64 is the reliable path on native RN — see uploadAvatar.
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [saving, setSaving]         = useState(false);

  // Reset state khi modal mở lại
  useEffect(() => {
    if (visible) {
      setName(currentName);
      setNameError('');
      setAvatarUri(currentAvatarUrl);
      setAvatarBase64(null);
      setAvatarChanged(false);
    }
  }, [visible, currentName, currentAvatarUrl]);

  // Validate name theo thời gian thực
  const handleNameChange = (text: string) => {
    setName(text);
    if (text.length === 0) {
      setNameError('');
      return;
    }
    const result = validateDisplayName(text);
    setNameError(result.error ?? '');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Hãy cho phép ứng dụng truy cập thư viện ảnh trong Cài đặt.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      const mimeType = asset.mimeType ?? getMimeFromUri(asset.uri);
      const validation = validateAvatarFile(mimeType, asset.fileSize ?? undefined);
      if (!validation.valid) {
        Alert.alert('Ảnh không hợp lệ', validation.error);
        return;
      }

      setAvatarUri(asset.uri);
      setAvatarBase64(asset.base64 ?? null);
      setAvatarChanged(true);
    }
  };

  const removeAvatar = () => {
    setAvatarUri(null);
    setAvatarBase64(null);
    setAvatarChanged(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();

    // Validate tên
    const validation = validateDisplayName(trimmedName);
    if (!validation.valid) {
      setNameError(validation.error ?? 'Tên không hợp lệ');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      let finalAvatarUrl: string | null = currentAvatarUrl;

      // Upload ảnh mới nếu đã thay đổi
      if (avatarChanged) {
        if (avatarUri) {
          finalAvatarUrl = await uploadAvatar(user.id, avatarUri, avatarBase64);
        } else {
          // Xoá ảnh cũ
          if (currentAvatarUrl) {
            await deleteOldAvatar(user.id);
          }
          finalAvatarUrl = null;
        }
      }

      await updateProfile(trimmedName, finalAvatarUrl);
      onSaved(trimmedName, finalAvatarUrl);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message ?? 'Không thể cập nhật hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const initial = (name.trim()[0] ?? currentName[0] ?? 'M').toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Chỉnh sửa hồ sơ</Text>

            {/* Avatar section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarWrap} activeOpacity={0.8}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                )}
                <View style={styles.avatarEditBadge}>
                  <Text style={styles.avatarEditIcon}>{ASSETS.editProfile.camera}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.avatarActions}>
                <TouchableOpacity style={styles.avatarBtn} onPress={pickImage} activeOpacity={0.7}>
                  <Text style={styles.avatarBtnText}>Chọn ảnh</Text>
                </TouchableOpacity>
                {avatarUri && (
                  <TouchableOpacity style={[styles.avatarBtn, styles.avatarBtnRemove]} onPress={removeAvatar} activeOpacity={0.7}>
                    <Text style={[styles.avatarBtnText, { color: C.error }]}>Xoá ảnh</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.avatarHint}>JPG, PNG, WEBP, GIF · Tối đa 5MB · Tỉ lệ 1:1</Text>
            </View>

            {/* Name input */}
            <View style={styles.field}>
              <Text style={styles.label}>Tên hiển thị</Text>
              <TextInput
                style={[styles.input, nameError ? styles.inputError : null]}
                value={name}
                onChangeText={handleNameChange}
                placeholder="Nhập tên hiển thị..."
                placeholderTextColor={C.textSecond}
                maxLength={30}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="done"
              />
              <View style={styles.fieldFooter}>
                {nameError ? (
                  <Text style={styles.errorText}>{nameError}</Text>
                ) : (
                  <Text style={styles.hintText}>
                    2–30 ký tự · Chữ cái, số, khoảng trắng, dấu gạch ngang
                  </Text>
                )}
                <Text style={[styles.charCount, name.length > 25 && styles.charCountWarn]}>
                  {name.length}/30
                </Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7} disabled={saving}>
                <Text style={styles.cancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (saving || !!nameError || name.trim().length < 2) && styles.saveBtnDisabled]}
                onPress={handleSave}
                activeOpacity={0.8}
                disabled={saving || !!nameError || name.trim().length < 2}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMimeFromUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  };
  return map[ext] ?? 'image/jpeg';
}

/** Decode a base64 string into raw bytes (atob is a global in RN 0.74+ / web). */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function uploadAvatar(
  userId: string,
  localUri: string,
  base64: string | null,
): Promise<string> {
  const ext    = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mime   = getMimeFromUri(localUri);
  const path   = `${userId}/avatar.${ext}`;

  // On native, `fetch(localUri).blob()` yields a 0-byte upload — supabase-js
  // can't read a React Native Blob body. Upload the picker's base64 payload as
  // a raw ArrayBuffer instead. Fall back to the Blob path (web, or no base64).
  let body: Uint8Array | Blob;
  if (base64) {
    body = base64ToBytes(base64);
  } else {
    const response = await fetch(localUri);
    body = await response.blob();
  }

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, body, { contentType: mime, upsert: true });

  if (error) throw new Error(`Không thể tải ảnh lên: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

  // Thêm cache-buster để ảnh mới không bị cache
  return `${publicUrl}?t=${Date.now()}`;
}

async function deleteOldAvatar(userId: string): Promise<void> {
  const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  const paths = exts.map((e) => `${userId}/avatar.${e}`);
  // Bỏ qua lỗi nếu file không tồn tại
  await supabase.storage.from('avatars').remove(paths).catch(() => {});
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.line, alignSelf: 'center', marginBottom: 16,
  },
  title: {
    fontSize: 20, fontFamily: F.display, color: C.ink,
    textAlign: 'center', marginBottom: 24,
  },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarImg: {
    width: 100, height: 100, borderRadius: R.pill,
    borderWidth: 3, borderColor: C.orange,
  },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: R.pill,
    backgroundColor: C.peachGlow,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: C.orange,
  },
  avatarInitial: { fontSize: 40, fontFamily: F.displayBold, color: C.orangeDeepest },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: R.pill,
    backgroundColor: C.orange,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarEditIcon: { fontSize: 14 },
  avatarActions: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  avatarBtn: {
    paddingVertical: 8, paddingHorizontal: 18,
    borderRadius: R.pill, borderWidth: 1.5, borderColor: C.orange,
  },
  avatarBtnRemove: { borderColor: C.error },
  avatarBtnText: { fontSize: 13, fontFamily: F.display, color: C.orange },
  avatarHint: { fontSize: 11, fontFamily: F.body, color: C.inkSlate, textAlign: 'center' },

  // Field
  field: { marginBottom: 8 },
  label: { fontSize: 14, fontFamily: F.display, color: C.inkBrown, marginBottom: 8 },
  input: {
    borderWidth: 2, borderColor: C.peachBorder, borderRadius: R.pill,
    paddingHorizontal: 18, height: 52,
    fontSize: 16, fontFamily: F.body, color: C.ink, backgroundColor: C.surfaceSunken,
  },
  inputError: { borderColor: C.error },
  fieldFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 4 },
  errorText:   { flex: 1, fontSize: 12, fontFamily: F.bodyMedium, color: C.error },
  hintText:    { flex: 1, fontSize: 11, fontFamily: F.body, color: C.inkSlate },
  charCount:   { fontSize: 11, fontFamily: F.bodyMedium, color: C.inkSlate },
  charCountWarn: { color: '#FF8C00' },

  // Actions
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: R.pill,
    borderWidth: 2, borderColor: C.inkSlateDeep, alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontFamily: F.display, color: C.ink },
  saveBtn: {
    flex: 2, paddingVertical: 15, borderRadius: R.pill,
    backgroundColor: C.orange, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: { fontSize: 15, fontFamily: F.display, color: '#fff' },
});
