// 账号管理页面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { Sites } from '../../app/sites';
import { LocalStorageService } from '../../services/LocalStorageService';
import { Utils } from '../../utils';

const AccountPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const storage = LocalStorageService.getInstance();

  const [bilibiliCookie, setBilibiliCookie] = useState<string>('');
  const [bilibiliName, setBilibiliName] = useState<string>('未登录');
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [cookieInput, setCookieInput] = useState('');

  useEffect(() => {
    loadAccountInfo();
  }, []);

  const loadAccountInfo = async () => {
    const cookie = await storage.getValue(
      LocalStorageService.kBilibiliCookie,
      ''
    );
    setBilibiliCookie(cookie);
    // TODO: 如果有 cookie，可以尝试获取用户信息
    if (cookie) {
      setBilibiliName('已登录');
    }
  };

  const handleBilibiliLogin = async () => {
    if (bilibiliCookie) {
      // 已登录，显示退出选项
      const result = await Utils.showAlertDialog(
        '确定要退出哔哩哔哩账号吗？',
        { title: '退出登录' }
      );
      if (result) {
        await storage.setValue(LocalStorageService.kBilibiliCookie, '');
        setBilibiliCookie('');
        setBilibiliName('未登录');
        Alert.alert('提示', '已退出登录');
      }
    } else {
      // 未登录，显示登录选项
      Alert.alert(
        '登录哔哩哔哩',
        '请选择登录方式',
        [
          {
            text: 'Cookie登录',
            onPress: handleCookieLogin,
          },
          {
            text: '取消',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleCookieLogin = () => {
    setCookieInput('');
    setShowCookieModal(true);
  };

  const handleConfirmCookie = async () => {
    if (!cookieInput.trim()) {
      Alert.alert('提示', '请输入 Cookie');
      return;
    }

    await storage.setValue(
      LocalStorageService.kBilibiliCookie,
      cookieInput.trim()
    );
    setBilibiliCookie(cookieInput.trim());
    setBilibiliName('已登录');
    setShowCookieModal(false);
    Alert.alert('提示', '登录成功');
    // TODO: 可以尝试获取用户信息
  };

  const bilibiliSite = Sites.allSites['bilibili'];

  return (
    <View style={styles.container}>
      <PageHeader title="账号管理" />

      <ScrollView style={styles.content}>
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            哔哩哔哩账号需要登录才能看高清晰度的直播，其他平台暂无此限制。
          </Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.accountItem}
            onPress={handleBilibiliLogin}
          >
            {bilibiliSite?.logo && (
              <Image source={bilibiliSite.logo} style={styles.accountLogo} />
            )}
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>哔哩哔哩</Text>
              <Text style={styles.accountStatus}>{bilibiliName}</Text>
            </View>
            <Icon
              name={bilibiliCookie ? 'log-out' : 'chevron-right'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.accountItem}>
            {Sites.allSites['douyu']?.logo && (
              <Image
                source={Sites.allSites['douyu'].logo}
                style={styles.accountLogo}
              />
            )}
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>斗鱼直播</Text>
              <Text style={styles.accountStatus}>无需登录</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.accountItem}>
            {Sites.allSites['huya']?.logo && (
              <Image
                source={Sites.allSites['huya'].logo}
                style={styles.accountLogo}
              />
            )}
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>虎牙直播</Text>
              <Text style={styles.accountStatus}>无需登录</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.accountItem}>
            {Sites.allSites['douyin']?.logo && (
              <Image
                source={Sites.allSites['douyin'].logo}
                style={styles.accountLogo}
              />
            )}
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>抖音直播</Text>
              <Text style={styles.accountStatus}>无需登录</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
          </View>
        </View>
      </ScrollView>

      {/* Cookie 输入 Modal */}
      <Modal
        visible={showCookieModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCookieModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cookie登录</Text>
            <Text style={styles.modalSubtitle}>请输入 Cookie</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="请输入 Cookie"
              value={cookieInput}
              onChangeText={setCookieInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowCookieModal(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleConfirmCookie}
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
  hintContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  accountLogo: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  accountStatus: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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

export default AccountPage;

