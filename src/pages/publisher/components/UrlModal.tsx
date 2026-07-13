import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import jssdk from '@htyf-mp/js-sdk';
import { styles } from '../styles';

type Props = {
  visible: boolean;
  url: string;
  onSave: (url: string) => void;
  onClose: () => void;
};

/**
 * URL editor in a separate Modal. This is deliberate: the TextInput (and its
 * keyboard) live in the Modal's own window, so opening the keyboard here can
 * NOT resize the main streaming screen — which is what previously broke the
 * camera preview in Picture-in-Picture (an inline input under a
 * KeyboardAvoidingView mis-sized the preview surface). The streaming screen
 * itself now has no text input at all.
 */
export function UrlModal({ visible, url, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(url);
  const [scanning, setScanning] = useState(false);

  // Re-seed the draft from the current URL each time the sheet opens.
  useEffect(() => {
    if (visible) setDraft(url);
  }, [visible, url]);

  const onScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const result = await jssdk.openQR({ text: '请扫描推流地址二维码' });
      const scanned = result?.data?.trim();
      if (scanned) {
        setDraft(scanned);
      }
    } catch {
      await jssdk.showToast?.({ title: '扫码失败', type: 'error' });
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* `padding` (both platforms) reacts to keyboard-show events directly, so
          it lifts the bottom sheet above the keyboard even inside a Modal whose
          window doesn't adjustResize. */}
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior="padding">
        <View style={styles.urlSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>RTMP URL</Text>
            <Pressable
              onPress={onScan}
              disabled={scanning}
              style={[styles.modalHeaderBtn, scanning && styles.btnDisabled]}
            >
              <Text style={styles.modalHeaderBtnText}>
                {scanning ? '扫描中…' : '扫一扫'}
              </Text>
            </Pressable>
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            multiline
            style={[styles.input, { marginTop: 12 }]}
            placeholder="rtmp://host:1935/app/stream"
            placeholderTextColor="#666"
          />
          <View style={styles.row}>
            <Pressable onPress={onClose} style={[styles.btn, styles.btnAlt]}>
              <Text style={styles.btnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onSave(draft.trim())} style={styles.btn}>
              <Text style={styles.btnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
