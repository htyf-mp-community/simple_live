// 其他设置页面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { LocalStorageService } from '../../services/LocalStorageService';
import { Utils } from '../../utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OtherSettingsPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const storage = LocalStorageService.getInstance();

  const [customPlayerOutput, setCustomPlayerOutput] = useState(false);
  const [videoOutputDriver, setVideoOutputDriver] = useState('libmpv');
  const [audioOutputDriver, setAudioOutputDriver] = useState('audiounit');
  const [videoHardwareDecoder, setVideoHardwareDecoder] = useState('auto');
  const [logEnable, setLogEnable] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setCustomPlayerOutput(
      await storage.getValue(LocalStorageService.kCustomPlayerOutput, false)
    );
    setVideoOutputDriver(
      await storage.getValue(
        LocalStorageService.kVideoOutputDriver,
        Platform.OS === 'android' ? 'gpu' : 'libmpv'
      )
    );
    setAudioOutputDriver(
      await storage.getValue(
        LocalStorageService.kAudioOutputDriver,
        Platform.OS === 'ios'
          ? 'audiounit'
          : Platform.OS === 'android'
          ? 'audiotrack'
          : 'coreaudio'
      )
    );
    setVideoHardwareDecoder(
      await storage.getValue(
        LocalStorageService.kVideoHardwareDecoder,
        Platform.OS === 'android' ? 'auto-safe' : 'auto'
      )
    );
    setLogEnable(
      await storage.getValue(LocalStorageService.kLogEnable, false)
    );
  };

  const videoOutputDrivers: Record<string, string> = {
    gpu: 'gpu',
    'gpu-next': 'gpu-next',
    xv: 'xv (X11 only)',
    x11: 'x11 (X11 only)',
    vdpau: 'vdpau (X11 only)',
    direct3d: 'direct3d (Windows only)',
    sdl: 'sdl',
    'dmabuf-wayland': 'dmabuf-wayland',
    vaapi: 'vaapi',
    null: 'null',
    libmpv: 'libmpv',
    mediacodec_embed: 'mediacodec_embed (Android only)',
  };

  const audioOutputDrivers: Record<string, string> = {
    null: 'null (No audio output)',
    pulse: 'pulse (Linux, uses PulseAudio)',
    pipewire: 'pipewire (Linux)',
    alsa: 'alsa (Linux only)',
    oss: 'oss (Linux only)',
    jack: 'jack (Linux/macOS)',
    directsound: 'directsound (Windows only)',
    wasapi: 'wasapi (Windows only)',
    winmm: 'winmm (Windows only)',
    audiounit: 'audiounit (iOS only)',
    coreaudio: 'coreaudio (macOS only)',
    opensles: 'opensles (Android only)',
    audiotrack: 'audiotrack (Android only)',
    aaudio: 'aaudio (Android only)',
    pcm: 'pcm (Cross-platform)',
    sdl: 'sdl (Cross-platform)',
  };

  const hardwareDecoders: Record<string, string> = {
    no: 'no',
    auto: 'auto',
    'auto-safe': 'auto-safe',
    yes: 'yes',
    'auto-copy': 'auto-copy',
    d3d11va: 'd3d11va',
    'd3d11va-copy': 'd3d11va-copy',
    videotoolbox: 'videotoolbox',
    'videotoolbox-copy': 'videotoolbox-copy',
    vaapi: 'vaapi',
    'vaapi-copy': 'vaapi-copy',
    nvdec: 'nvdec',
    'nvdec-copy': 'nvdec-copy',
    drm: 'drm',
    'drm-copy': 'drm-copy',
    vulkan: 'vulkan',
    'vulkan-copy': 'vulkan-copy',
    dxva2: 'dxva2',
    'dxva2-copy': 'dxva2-copy',
    vdpau: 'vdpau',
    'vdpau-copy': 'vdpau-copy',
    mediacodec: 'mediacodec',
    'mediacodec-copy': 'mediacodec-copy',
    cuda: 'cuda',
    'cuda-copy': 'cuda-copy',
    crystalhd: 'crystalhd',
    rkmpp: 'rkmpp',
  };

  const handleExportConfig = async () => {
    try {
      // 获取所有 AsyncStorage 数据
      const allKeys = await AsyncStorage.getAllKeys();
      const allData = await AsyncStorage.multiGet(allKeys);
      
      const config: Record<string, any> = {};
      const shield: Record<string, string> = {};
      
      allData.forEach(([key, value]) => {
        if (key.startsWith('DanmuShield_')) {
          shield[key] = value || '';
        } else {
          config[key] = value;
        }
      });

      const data = {
        type: 'simple_live',
        platform: Platform.OS,
        version: 1,
        time: Date.now(),
        config,
        shield,
      };

      const jsonString = JSON.stringify(data, null, 2);
      await Utils.copyToClipboard(jsonString);
      Alert.alert('提示', '配置已复制到剪贴板，请保存到文件');
    } catch (error) {
      Alert.alert('错误', `导出失败: ${error}`);
    }
  };

  const handleImportConfig = async () => {
    Alert.alert(
      '导入配置',
      '请从剪贴板粘贴配置 JSON',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '粘贴',
          onPress: async () => {
            try {
              const clipboardText = await Utils.getClipboard();
              if (!clipboardText) {
                Alert.alert('错误', '剪贴板为空');
                return;
              }

              const data = JSON.parse(clipboardText);
              if (data.type !== 'simple_live') {
                Alert.alert('错误', '不支持的配置文件');
                return;
              }

              if (data.platform !== Platform.OS) {
                const confirm = await Utils.showAlertDialog(
                  '导入配置文件平台不匹配，是否继续导入？',
                  { title: '平台不匹配' }
                );
                if (!confirm) return;
              }

              // 导入配置
              const config = data.config || {};
              const shield = data.shield || {};
              
              // 清除现有配置
              const allKeys = await AsyncStorage.getAllKeys();
              await AsyncStorage.multiRemove(allKeys);

              // 导入新配置
              const configEntries = Object.entries(config).map(([key, value]) => [
                key,
                typeof value === 'string' ? value : JSON.stringify(value),
              ]);
              await AsyncStorage.multiSet(configEntries);

              // 导入屏蔽词
              const shieldEntries = Object.entries(shield).map(([key, value]) => [
                key,
                value || '',
              ]);
              await AsyncStorage.multiSet(shieldEntries);

              Alert.alert('提示', '导入成功，请重启应用');
            } catch (error) {
              Alert.alert('错误', `导入失败: ${error}`);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleResetConfig = async () => {
    const result = await Utils.showAlertDialog(
      '是否重置所有配置为默认值？',
      { title: '重置配置' }
    );
    if (!result) return;

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(allKeys);
      Alert.alert('提示', '重置成功，请重启应用');
      // 重新加载设置
      loadSettings();
    } catch (error) {
      Alert.alert('错误', `重置失败: ${error}`);
    }
  };

  const showDriverPicker = (
    title: string,
    currentValue: string,
    options: Record<string, string>,
    onSelect: (value: string) => void
  ) => {
    const optionList = Object.entries(options).map(([key, label]) => ({
      text: label,
      onPress: () => onSelect(key),
    }));

    Alert.alert(
      title,
      '',
      [...optionList, { text: '取消', style: 'cancel' }],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader title="其他设置" />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleExportConfig}
              >
                <Icon name="download" size={20} color="#3498db" />
                <Text style={styles.actionButtonText}>导出配置</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleImportConfig}
              >
                <Icon name="upload" size={20} color="#3498db" />
                <Text style={styles.actionButtonText}>导入配置</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleResetConfig}
              >
                <Icon name="refresh-cw" size={20} color="#f44336" />
                <Text style={styles.actionButtonText}>重置配置</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>播放器高级设置</Text>
          <Text style={styles.warningText}>
            请勿随意修改以下设置，除非你知道自己在做什么。在修改以下设置前，你应该先查阅{' '}
            <Text
              style={styles.linkText}
              onPress={() => {
                Linking.openURL(
                  'https://mpv.io/manual/stable/#video-output-drivers'
                );
              }}
            >
              MPV的文档
            </Text>
          </Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>
                  自定义输出驱动与硬件加速
                </Text>
              </View>
              <Switch
                value={customPlayerOutput}
                onValueChange={async (value) => {
                  setCustomPlayerOutput(value);
                  await storage.setValue(
                    LocalStorageService.kCustomPlayerOutput,
                    value
                  );
                }}
              />
            </View>

            {customPlayerOutput && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() =>
                    showDriverPicker(
                      '视频输出驱动(--vo)',
                      videoOutputDriver,
                      videoOutputDrivers,
                      async (value) => {
                        setVideoOutputDriver(value);
                        await storage.setValue(
                          LocalStorageService.kVideoOutputDriver,
                          value
                        );
                      }
                    )
                  }
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>视频输出驱动(--vo)</Text>
                  </View>
                  <View style={styles.settingValue}>
                    <Text style={styles.settingValueText}>
                      {videoOutputDrivers[videoOutputDriver] || videoOutputDriver}
                    </Text>
                    <Icon name="chevron-right" size={20} color="#999" />
                  </View>
                </TouchableOpacity>

                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() =>
                    showDriverPicker(
                      '音频输出驱动(--ao)',
                      audioOutputDriver,
                      audioOutputDrivers,
                      async (value) => {
                        setAudioOutputDriver(value);
                        await storage.setValue(
                          LocalStorageService.kAudioOutputDriver,
                          value
                        );
                      }
                    )
                  }
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>音频输出驱动(--ao)</Text>
                  </View>
                  <View style={styles.settingValue}>
                    <Text style={styles.settingValueText}>
                      {audioOutputDrivers[audioOutputDriver] || audioOutputDriver}
                    </Text>
                    <Icon name="chevron-right" size={20} color="#999" />
                  </View>
                </TouchableOpacity>

                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() =>
                    showDriverPicker(
                      '硬件解码器(--hwdec)',
                      videoHardwareDecoder,
                      hardwareDecoders,
                      async (value) => {
                        setVideoHardwareDecoder(value);
                        await storage.setValue(
                          LocalStorageService.kVideoHardwareDecoder,
                          value
                        );
                      }
                    )
                  }
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>硬件解码器(--hwdec)</Text>
                  </View>
                  <View style={styles.settingValue}>
                    <Text style={styles.settingValueText}>
                      {hardwareDecoders[videoHardwareDecoder] || videoHardwareDecoder}
                    </Text>
                    <Icon name="chevron-right" size={20} color="#999" />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>日志记录</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>开启日志记录</Text>
                <Text style={styles.settingDesc}>
                  开启后将记录调试日志，可以将日志文件提供给开发者用于排查问题
                </Text>
              </View>
              <Switch
                value={logEnable}
                onValueChange={async (value) => {
                  setLogEnable(value);
                  await storage.setValue(
                    LocalStorageService.kLogEnable,
                    value
                  );
                }}
              />
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginBottom: 8,
  },
  linkText: {
    color: '#3498db',
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
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
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
});

export default OtherSettingsPage;

