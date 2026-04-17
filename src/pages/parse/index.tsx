// 链接解析页面
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { Sites } from '../../app/sites';
import { Constants } from '../../app/constants';
import axios from 'axios';

const ParsePage = () => {
  const navigation = useNavigation();

  const [roomUrl, setRoomUrl] = useState('');
  const [playUrl, setPlayUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const parseUrl = async (url: string): Promise<[string, any] | null> => {
    if (!url || !url.trim()) {
      return null;
    }

    let roomId = '';
    let site = null;

    // 哔哩哔哩
    if (url.includes('bilibili.com')) {
      const match = url.match(/bilibili\.com\/([\d\w]+)/);
      roomId = match?.[1] || '';
      site = Sites.allSites[Constants.kBiliBili];
    } else if (url.includes('b23.tv')) {
      // b23.tv 短链接需要先获取重定向
      const match = url.match(/https?:\/\/b23\.tv\/[0-9a-zA-Z]+/);
      if (match) {
        try {
          const response = await axios.head(match[0], {
            maxRedirects: 0,
            validateStatus: (status) => status < 400,
          });
          const location = response.headers.location || match[0];
          return parseUrl(location);
        } catch (error) {
          console.error('Get b23.tv location error:', error);
        }
      }
    }
    // 斗鱼
    else if (url.includes('douyu.com')) {
      let match = url.match(/douyu\.com\/([\d\w]+)/);
      if (url.includes('topic')) {
        match = url.match(/[?&]rid=([\d]+)/);
      }
      roomId = match?.[1] || '';
      site = Sites.allSites[Constants.kDouyu];
    }
    // 虎牙
    else if (url.includes('huya.com')) {
      const match = url.match(/huya\.com\/([\d\w]+)/);
      roomId = match?.[1] || '';
      site = Sites.allSites[Constants.kHuya];
    }
    // 抖音
    else if (url.includes('live.douyin.com')) {
      const match = url.match(/live\.douyin\.com\/([\d\w]+)/);
      roomId = match?.[1] || '';
      site = Sites.allSites[Constants.kDouyin];
    } else if (url.includes('webcast.amemv.com')) {
      const match = url.match(/reflow\/(\d+)/);
      roomId = match?.[1] || '';
      site = Sites.allSites[Constants.kDouyin];
    } else if (url.includes('v.douyin.com')) {
      const match = url.match(/https?:\/\/v\.douyin\.com\/[\d\w]+\//);
      if (match) {
        try {
          const response = await axios.head(match[0], {
            maxRedirects: 0,
            validateStatus: (status) => status < 400,
          });
          const location = response.headers.location || match[0];
          return parseUrl(location);
        } catch (error) {
          console.error('Get douyin short link error:', error);
        }
      }
    }

    if (roomId && site) {
      return [roomId, site];
    }

    return null;
  };

  const handleJumpToRoom = async () => {
    if (!roomUrl.trim()) {
      Alert.alert('提示', '链接不能为空');
      return;
    }

    setLoading(true);
    try {
      const result = await parseUrl(roomUrl.trim());
      if (!result) {
        Alert.alert('错误', '无法解析此链接');
        return;
      }

      const [roomId, site] = result;
      // @ts-ignore
      navigation.navigate('RoomPlayer', {
        site_id: site.id,
        roomId,
      });
      setRoomUrl('');
    } catch (error) {
      Alert.alert('错误', '解析链接失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGetPlayUrl = async () => {
    if (!playUrl.trim()) {
      Alert.alert('提示', '链接不能为空');
      return;
    }

    setLoading(true);
    try {
      const result = await parseUrl(playUrl.trim());
      if (!result) {
        Alert.alert('错误', '无法解析此链接');
        return;
      }

      const [roomId, site] = result;
      const detail = await site.liveSite.getRoomDetail(roomId);
      const qualities = await site.liveSite.getPlayQualities(detail);

      if (qualities.length === 0) {
        Alert.alert('错误', '读取直链失败，无法读取清晰度');
        return;
      }

      // 默认选择第一个清晰度
      const selectedQuality = qualities[0];
      try {
        const playUrls = await site.liveSite.getPlayUrls(detail, selectedQuality);
        if (playUrls && playUrls.urls && playUrls.urls.length > 0) {
          const urlText = playUrls.urls.join('\n');
          // 显示播放地址
          Alert.alert(
            '播放地址',
            urlText,
            [
              {
                text: '复制',
                onPress: async () => {
                  const { Utils } = await import('../../utils');
                  await Utils.copyToClipboard(urlText);
                  Alert.alert('提示', '已复制到剪贴板');
                },
              },
              { text: '确定' },
            ],
            { cancelable: true }
          );
        } else {
          Alert.alert('错误', '获取播放地址失败');
        }
      } catch (error) {
        Alert.alert('错误', '获取播放地址失败');
      }
    } catch (error) {
      Alert.alert('错误', '获取播放地址失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <PageHeader title="链接解析" />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>直播间跳转</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="输入或粘贴直播间链接"
              value={roomUrl}
              onChangeText={setRoomUrl}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleJumpToRoom}
              disabled={loading}
            >
              <Icon name="external-link" size={20} color="#fff" />
              <Text style={styles.buttonText}>跳转到直播间</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>获取直链</Text>
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="输入或粘贴直播间链接"
              value={playUrl}
              onChangeText={setPlayUrl}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleGetPlayUrl}
              disabled={loading}
            >
              <Icon name="link" size={20} color="#fff" />
              <Text style={styles.buttonText}>获取直链</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.helpTitle}>支持以下类型的链接解析：</Text>
          <Text style={styles.helpText}>
            哔哩哔哩：{'\n'}
            https://live.bilibili.com/xxxxx{'\n'}
            https://b23.tv/xxxxx{'\n\n'}
            虎牙直播：{'\n'}
            https://www.huya.com/xxxxx{'\n\n'}
            斗鱼直播：{'\n'}
            https://www.douyu.com/xxxxx{'\n'}
            https://www.douyu.com/topic/xxx?rid=xxx{'\n\n'}
            抖音直播：{'\n'}
            https://v.douyin.com/xxxxx{'\n'}
            https://live.douyin.com/xxxxx{'\n'}
            https://webcast.amemv.com/webcast/reflow/xxxxx
          </Text>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 20,
  },
});

export default ParsePage;

