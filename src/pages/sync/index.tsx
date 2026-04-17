// 数据同步页面
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { Utils } from '../../utils';

const SyncPage = () => {
  const navigation = useNavigation();

  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    Alert.alert('提示', '远程同步功能需要 SignalR 支持，当前版本暂未实现');
    // TODO: 实现创建房间功能
  };

  const handleJoinRoom = () => {
    setRoomId('');
    setShowJoinRoomModal(true);
  };

  const handleConfirmJoinRoom = () => {
    if (!roomId.trim()) {
      Alert.alert('提示', '房间号不能为空');
      return;
    }
    if (roomId.trim().length !== 5) {
      Alert.alert('提示', '请输入5位房间号');
      return;
    }
    setShowJoinRoomModal(false);
    Alert.alert('提示', '远程同步功能需要 SignalR 支持，当前版本暂未实现');
    // TODO: 实现加入房间功能
  };

  const handleWebDAV = () => {
    Alert.alert('提示', 'WebDAV 同步功能当前版本暂未实现');
    // TODO: 实现 WebDAV 同步
  };

  const handleLocalSync = () => {
    Alert.alert('提示', '局域网同步功能当前版本暂未实现');
    // TODO: 实现局域网同步
  };

  return (
    <View style={styles.container}>
      <PageHeader title="数据同步" />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>远程同步</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleCreateRoom}
            >
              <Icon name="home" size={24} color="#333" />
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemTitle}>创建房间</Text>
                <Text style={styles.menuItemSubtitle}>
                  其他设备可以通过房间号加入
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleJoinRoom}
            >
              <Icon name="plus-circle" size={24} color="#333" />
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemTitle}>加入房间</Text>
                <Text style={styles.menuItemSubtitle}>
                  加入其他设备创建的房间
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleWebDAV}
            >
              <Icon name="cloud" size={24} color="#333" />
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemTitle}>WebDAV</Text>
                <Text style={styles.menuItemSubtitle}>通过 WebDAV 同步数据</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>局域网同步</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLocalSync}
            >
              <Icon name="wifi" size={24} color="#333" />
              <View style={styles.menuItemInfo}>
                <Text style={styles.menuItemTitle}>局域网同步</Text>
                <Text style={styles.menuItemSubtitle}>在局域网内同步数据</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            数据同步功能可以将关注列表、历史记录、屏蔽词等数据在不同设备间同步。
          </Text>
        </View>
      </ScrollView>

      {/* 加入房间 Modal */}
      <Modal
        visible={showJoinRoomModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowJoinRoomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>加入房间</Text>
            <Text style={styles.modalSubtitle}>请输入房间号（5位，不区分大小写）</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="请输入房间号"
              value={roomId}
              onChangeText={(text) => setRoomId(text.toUpperCase())}
              maxLength={5}
              autoFocus
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowJoinRoomModal(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleConfirmJoinRoom}
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
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  hintContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 8,
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 4,
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

export default SyncPage;

