// 关注设置页面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { LocalStorageService } from '../../services/LocalStorageService';
import { FollowService } from '../../services/FollowService';

const FollowSettingsPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const storage = LocalStorageService.getInstance();
  const followService = FollowService.getInstance();

  const [autoUpdateEnable, setAutoUpdateEnable] = useState(true);
  const [updateDuration, setUpdateDuration] = useState(10);
  const [threadCount, setThreadCount] = useState(4);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setAutoUpdateEnable(
      await storage.getValue(
        LocalStorageService.kAutoUpdateFollowEnable,
        true
      )
    );
    setUpdateDuration(
      await storage.getValue(LocalStorageService.kUpdateFollowDuration, 10)
    );
    setThreadCount(
      await storage.getValue(
        LocalStorageService.kUpdateFollowThreadCount,
        4
      )
    );
  };

  const handleUpdateDurationChange = async (value: string) => {
    const num = parseInt(value) || 10;
    if (num < 1 || num > 60) {
      Alert.alert('提示', '更新间隔必须在 1-60 分钟之间');
      return;
    }
    setUpdateDuration(num);
    await storage.setValue(LocalStorageService.kUpdateFollowDuration, num);
    followService.initTimer();
  };

  const handleThreadCountChange = async (value: string) => {
    const num = parseInt(value) || 4;
    if (num < 1 || num > 10) {
      Alert.alert('提示', '线程数必须在 1-10 之间');
      return;
    }
    setThreadCount(num);
    await storage.setValue(
      LocalStorageService.kUpdateFollowThreadCount,
      num
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader title="关注设置" />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>自动更新</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>自动更新关注状态</Text>
                <Text style={styles.settingDesc}>
                  定期检查关注用户的直播状态
                </Text>
              </View>
              <Switch
                value={autoUpdateEnable}
                onValueChange={async (value) => {
                  setAutoUpdateEnable(value);
                  await storage.setValue(
                    LocalStorageService.kAutoUpdateFollowEnable,
                    value
                  );
                  followService.initTimer();
                }}
              />
            </View>

            {autoUpdateEnable && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>更新间隔（分钟）</Text>
                    <Text style={styles.settingDesc}>
                      自动检查直播状态的间隔时间
                    </Text>
                  </View>
                  <TextInput
                    style={styles.numberInput}
                    value={updateDuration.toString()}
                    onChangeText={handleUpdateDurationChange}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>更新线程数</Text>
                    <Text style={styles.settingDesc}>
                      同时检查的关注用户数量（1-10）
                    </Text>
                  </View>
                  <TextInput
                    style={styles.numberInput}
                    value={threadCount.toString()}
                    onChangeText={handleThreadCountChange}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
              </>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
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
  numberInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
  },
});

export default FollowSettingsPage;

