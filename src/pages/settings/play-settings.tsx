// 直播设置页面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { LocalStorageService } from '../../services/LocalStorageService';

const PlaySettingsPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const storage = LocalStorageService.getInstance();

  const [hardwareDecode, setHardwareDecode] = useState(true);
  const [qualityLevel, setQualityLevel] = useState(1);
  const [qualityLevelCellular, setQualityLevelCellular] = useState(1);
  const [playerAutoPause, setPlayerAutoPause] = useState(false);
  const [playerForceHttps, setPlayerForceHttps] = useState(false);
  const [autoFullScreen, setAutoFullScreen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setHardwareDecode(
      await storage.getValue(LocalStorageService.kHardwareDecode, true)
    );
    setQualityLevel(
      await storage.getValue(LocalStorageService.kQualityLevel, 1)
    );
    setQualityLevelCellular(
      await storage.getValue(LocalStorageService.kQualityLevelCellular, 1)
    );
    setPlayerAutoPause(
      await storage.getValue(LocalStorageService.kPlayerAutoPause, false)
    );
    setPlayerForceHttps(
      await storage.getValue(LocalStorageService.kPlayerForceHttps, false)
    );
    setAutoFullScreen(
      await storage.getValue(LocalStorageService.kAutoFullScreen, false)
    );
  };

  const qualityOptions = [
    { value: 0, label: '最低' },
    { value: 1, label: '中等' },
    { value: 2, label: '最高' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="直播设置" />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>播放设置</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>硬件解码</Text>
                <Text style={styles.settingDesc}>使用硬件加速解码视频</Text>
              </View>
              <Switch
                value={hardwareDecode}
                onValueChange={async (value) => {
                  setHardwareDecode(value);
                  await storage.setValue(
                    LocalStorageService.kHardwareDecode,
                    value
                  );
                }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>自动暂停</Text>
                <Text style={styles.settingDesc}>
                  切换到后台时自动暂停播放
                </Text>
              </View>
              <Switch
                value={playerAutoPause}
                onValueChange={async (value) => {
                  setPlayerAutoPause(value);
                  await storage.setValue(
                    LocalStorageService.kPlayerAutoPause,
                    value
                  );
                }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>强制 HTTPS</Text>
                <Text style={styles.settingDesc}>
                  强制使用 HTTPS 协议播放
                </Text>
              </View>
              <Switch
                value={playerForceHttps}
                onValueChange={async (value) => {
                  setPlayerForceHttps(value);
                  await storage.setValue(
                    LocalStorageService.kPlayerForceHttps,
                    value
                  );
                }}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>自动全屏</Text>
                <Text style={styles.settingDesc}>进入直播间时自动全屏</Text>
              </View>
              <Switch
                value={autoFullScreen}
                onValueChange={async (value) => {
                  setAutoFullScreen(value);
                  await storage.setValue(
                    LocalStorageService.kAutoFullScreen,
                    value
                  );
                }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>清晰度设置</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>WiFi 网络清晰度</Text>
              <View style={styles.qualitySelector}>
                {qualityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.qualityButton,
                      qualityLevel === option.value &&
                        styles.qualityButtonActive,
                    ]}
                    onPress={async () => {
                      setQualityLevel(option.value);
                      await storage.setValue(
                        LocalStorageService.kQualityLevel,
                        option.value
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.qualityButtonText,
                        qualityLevel === option.value &&
                          styles.qualityButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>移动网络清晰度</Text>
              <View style={styles.qualitySelector}>
                {qualityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.qualityButton,
                      qualityLevelCellular === option.value &&
                        styles.qualityButtonActive,
                    ]}
                    onPress={async () => {
                      setQualityLevelCellular(option.value);
                      await storage.setValue(
                        LocalStorageService.kQualityLevelCellular,
                        option.value
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.qualityButtonText,
                        qualityLevelCellular === option.value &&
                          styles.qualityButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  settingItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  qualitySelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  qualityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  qualityButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#e3f2fd',
  },
  qualityButtonText: {
    fontSize: 14,
    color: '#666',
  },
  qualityButtonTextActive: {
    color: '#3498db',
    fontWeight: '500',
  },
});

export default PlaySettingsPage;

