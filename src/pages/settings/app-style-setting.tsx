// 外观设置页面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '../../components/PageHeader';
import Icon from 'react-native-vector-icons/Feather';
import { LocalStorageService } from '../../services/LocalStorageService';

const AppStyleSettingPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const storage = LocalStorageService.getInstance();
  const [themeMode, setThemeMode] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const mode = await storage.getValue(LocalStorageService.kThemeMode, 0);
    setThemeMode(mode);
  };

  const handleThemeChange = async (mode: number) => {
    setThemeMode(mode);
    await storage.setValue(LocalStorageService.kThemeMode, mode);
  };

  const themeOptions = [
    { value: 0, label: '跟随系统' },
    { value: 1, label: '浅色模式' },
    { value: 2, label: '深色模式' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader title="外观设置" />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>显示主题</Text>
          <View style={styles.card}>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  themeMode === option.value && styles.optionItemActive,
                ]}
                onPress={() => handleThemeChange(option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    themeMode === option.value && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {themeMode === option.value && (
                  <Icon name="check" size={20} color="#3498db" />
                )}
              </TouchableOpacity>
            ))}
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
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionItemActive: {
    backgroundColor: '#f8f9fa',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextActive: {
    color: '#3498db',
    fontWeight: '500',
  },
});

export default AppStyleSettingPage;

