// 定时关闭设置页面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { LocalStorageService } from '../../services/LocalStorageService';

const AutoExitSettingsPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const storage = LocalStorageService.getInstance();

  const [autoExitEnable, setAutoExitEnable] = useState(false);
  const [autoExitDuration, setAutoExitDuration] = useState(60); // 分钟
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setAutoExitEnable(
      await storage.getValue(LocalStorageService.kAutoExitEnable, false)
    );
    const duration = await storage.getValue(
      LocalStorageService.kAutoExitDuration,
      60
    );
    setAutoExitDuration(duration);
    setHours(Math.floor(duration / 60));
    setMinutes(duration % 60);
  };

  const handleSaveTime = async () => {
    if (hours === 0 && minutes === 0) {
      Alert.alert('提示', '时间不能为 0');
      return;
    }
    const totalMinutes = hours * 60 + minutes;
    setAutoExitDuration(totalMinutes);
    await storage.setValue(LocalStorageService.kAutoExitDuration, totalMinutes);
    setShowTimePicker(false);
  };

  const formatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) {
      return `${h}小时${m}分钟`;
    } else if (h > 0) {
      return `${h}小时`;
    } else {
      return `${m}分钟`;
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="定时关闭设置" />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>启用定时关闭</Text>
                <Text style={styles.settingDesc}>
                  从进入直播间开始倒计时，时间到后自动关闭应用
                </Text>
              </View>
              <Switch
                value={autoExitEnable}
                onValueChange={async (value) => {
                  setAutoExitEnable(value);
                  await storage.setValue(
                    LocalStorageService.kAutoExitEnable,
                    value
                  );
                }}
              />
            </View>

            {autoExitEnable && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => setShowTimePicker(true)}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>自动关闭时间</Text>
                    <Text style={styles.settingDesc}>
                      从进入直播间开始倒计时
                    </Text>
                  </View>
                  <View style={styles.timeValue}>
                    <Text style={styles.timeValueText}>
                      {formatDuration(autoExitDuration)}
                    </Text>
                    <Icon name="chevron-right" size={20} color="#999" />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 时间选择器 Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>设置关闭时间</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Icon name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.timeInputContainer}>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>小时</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hours.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    if (num >= 0 && num <= 23) {
                      setHours(num);
                    }
                  }}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>分钟</Text>
                <TextInput
                  style={styles.timeInput}
                  value={minutes.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    if (num >= 0 && num <= 59) {
                      setMinutes(num);
                    }
                  }}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveTime}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    styles.modalButtonTextPrimary,
                  ]}
                >
                  确定
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
    color: '#999',
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeValueText: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  timeInputGroup: {
    alignItems: 'center',
  },
  timeInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timeInput: {
    width: 80,
    height: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 20,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonPrimary: {
    backgroundColor: '#3498db',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default AutoExitSettingsPage;

