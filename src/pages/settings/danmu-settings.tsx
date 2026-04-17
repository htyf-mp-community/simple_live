// 弹幕设置页面
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

const DanmuSettingsPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const storage = LocalStorageService.getInstance();

  const [danmuEnable, setDanmuEnable] = useState(true);
  const [danmuArea, setDanmuArea] = useState(0.8);
  const [danmuOpacity, setDanmuOpacity] = useState(1.0);
  const [danmuSize, setDanmuSize] = useState(16.0);
  const [danmuFontWeight, setDanmuFontWeight] = useState(3); // 正常
  const [danmuSpeed, setDanmuSpeed] = useState(10.0);
  const [danmuStrokeWidth, setDanmuStrokeWidth] = useState(2.0);
  const [danmuTopMargin, setDanmuTopMargin] = useState(0.0);
  const [danmuBottomMargin, setDanmuBottomMargin] = useState(0.0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setDanmuEnable(
      await storage.getValue(LocalStorageService.kDanmuEnable, true)
    );
    setDanmuArea(await storage.getValue(LocalStorageService.kDanmuArea, 0.8));
    setDanmuOpacity(
      await storage.getValue(LocalStorageService.kDanmuOpacity, 1.0)
    );
    setDanmuSize(await storage.getValue(LocalStorageService.kDanmuSize, 16.0));
    setDanmuFontWeight(
      await storage.getValue(LocalStorageService.kDanmuFontWeight, 3)
    );
    setDanmuSpeed(await storage.getValue(LocalStorageService.kDanmuSpeed, 10.0));
    setDanmuStrokeWidth(
      await storage.getValue(LocalStorageService.kDanmuStrokeWidth, 2.0)
    );
    setDanmuTopMargin(
      await storage.getValue(LocalStorageService.kDanmuTopMargin, 0.0)
    );
    setDanmuBottomMargin(
      await storage.getValue(LocalStorageService.kDanmuBottomMargin, 0.0)
    );
  };

  const updateNumber = async (
    key: string,
    value: number,
    setter: (v: number) => void
  ) => {
    setter(value);
    await storage.setValue(key, value);
  };

  const fontWeightOptions = [
    '极细',
    '很细',
    '细',
    '正常',
    '小粗',
    '偏粗',
    '粗',
    '很粗',
    '极粗',
  ];

  const NumberSetting = ({
    title,
    subtitle,
    value,
    min,
    max,
    step = 1,
    unit = '',
    displayValue,
    onValueChange,
  }: {
    title: string;
    subtitle?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    displayValue?: string;
    onValueChange: (value: number) => void;
  }) => {
    return (
      <View style={styles.numberSetting}>
        <View style={styles.numberSettingInfo}>
          <Text style={styles.numberSettingLabel}>{title}</Text>
          {subtitle && (
            <Text style={styles.numberSettingSubtitle}>{subtitle}</Text>
          )}
        </View>
        <View style={styles.numberSettingControls}>
          <TouchableOpacity
            style={[
              styles.numberButton,
              value <= min && styles.numberButtonDisabled,
            ]}
            onPress={() => {
              if (value > min) {
                onValueChange(Math.max(min, value - step));
              }
            }}
            disabled={value <= min}
          >
            <Icon name="minus" size={16} color={value <= min ? '#ccc' : '#333'} />
          </TouchableOpacity>
          <Text style={styles.numberValue}>
            {displayValue || `${value}${unit}`}
          </Text>
          <TouchableOpacity
            style={[
              styles.numberButton,
              value >= max && styles.numberButtonDisabled,
            ]}
            onPress={() => {
              if (value < max) {
                onValueChange(Math.min(max, value + step));
              }
            }}
            disabled={value >= max}
          >
            <Icon name="plus" size={16} color={value >= max ? '#ccc' : '#333'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader title="弹幕设置" />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>弹幕屏蔽</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                // @ts-ignore
                navigation.navigate('DanmuShield');
              }}
            >
              <Text style={styles.actionItemText}>关键词屏蔽</Text>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>弹幕设置</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>默认开关</Text>
              </View>
              <Switch
                value={danmuEnable}
                onValueChange={async (value) => {
                  setDanmuEnable(value);
                  await storage.setValue(
                    LocalStorageService.kDanmuEnable,
                    value
                  );
                }}
              />
            </View>

            <View style={styles.divider} />

            <NumberSetting
              title="显示区域"
              value={Math.round(danmuArea * 100)}
              min={10}
              max={100}
              step={10}
              unit="%"
              onValueChange={async (value) => {
                await updateNumber(
                  LocalStorageService.kDanmuArea,
                  value / 100.0,
                  setDanmuArea
                );
              }}
            />

            <View style={styles.divider} />

            <NumberSetting
              title="不透明度"
              value={Math.round(danmuOpacity * 100)}
              min={10}
              max={100}
              step={10}
              unit="%"
              onValueChange={async (value) => {
                await updateNumber(
                  LocalStorageService.kDanmuOpacity,
                  value / 100.0,
                  setDanmuOpacity
                );
              }}
            />

            <View style={styles.divider} />

            <NumberSetting
              title="字体大小"
              value={Math.round(danmuSize)}
              min={8}
              max={48}
              step={1}
              onValueChange={async (value) => {
                await updateNumber(
                  LocalStorageService.kDanmuSize,
                  value,
                  setDanmuSize
                );
              }}
            />

            <View style={styles.divider} />

            <NumberSetting
              title="字体粗细"
              value={danmuFontWeight}
              min={0}
              max={8}
              step={1}
              displayValue={fontWeightOptions[danmuFontWeight]}
              onValueChange={async (value) => {
                await updateNumber(
                  LocalStorageService.kDanmuFontWeight,
                  value,
                  setDanmuFontWeight
                );
              }}
            />

            <View style={styles.divider} />

            <NumberSetting
              title="滚动速度"
              subtitle="弹幕持续时间(秒)，越小速度越快"
              value={Math.round(danmuSpeed)}
              min={4}
              max={20}
              step={1}
              onValueChange={async (value) => {
                await updateNumber(
                  LocalStorageService.kDanmuSpeed,
                  value,
                  setDanmuSpeed
                );
              }}
            />

            <View style={styles.divider} />

            <NumberSetting
              title="字体描边"
              value={Math.round(danmuStrokeWidth)}
              min={0}
              max={10}
              step={1}
              onValueChange={async (value) => {
                await updateNumber(
                  LocalStorageService.kDanmuStrokeWidth,
                  value,
                  setDanmuStrokeWidth
                );
              }}
            />

            <View style={styles.divider} />

            <NumberSetting
              title="顶部边距"
              subtitle="曲面屏显示不全可设置此选项"
              value={Math.round(danmuTopMargin)}
              min={0}
              max={48}
              step={4}
              onValueChange={async (value) => {
                await updateNumber(
                  LocalStorageService.kDanmuTopMargin,
                  value,
                  setDanmuTopMargin
                );
              }}
            />

            <View style={styles.divider} />

            <NumberSetting
              title="底部边距"
              subtitle="曲面屏显示不全可设置此选项"
              value={Math.round(danmuBottomMargin)}
              min={0}
              max={48}
              step={4}
              onValueChange={async (value) => {
                await updateNumber(
                  LocalStorageService.kDanmuBottomMargin,
                  value,
                  setDanmuBottomMargin
                );
              }}
            />
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
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  actionItemText: {
    fontSize: 16,
    color: '#333',
  },
  numberSetting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  numberSettingInfo: {
    flex: 1,
    marginRight: 12,
  },
  numberSettingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  numberSettingSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  numberSettingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  numberButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  numberButtonDisabled: {
    opacity: 0.3,
  },
  numberValue: {
    fontSize: 16,
    color: '#333',
    minWidth: 60,
    textAlign: 'center',
  },
});

export default DanmuSettingsPage;

