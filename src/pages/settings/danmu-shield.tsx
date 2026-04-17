// 弹幕屏蔽页面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { LocalStorageService } from '../../services/LocalStorageService';

const DanmuShieldPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const storage = LocalStorageService.getInstance();

  const [shieldList, setShieldList] = useState<Set<string>>(new Set());
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    loadShieldList();
  }, []);

  const loadShieldList = async () => {
    const list = await storage.getShieldList();
    setShieldList(list);
  };

  const handleAdd = async () => {
    const keyword = inputText.trim();
    if (!keyword) {
      Alert.alert('提示', '请输入关键词');
      return;
    }

    // 检查是否是正则表达式（以 / 开头和结尾）
    if (keyword.startsWith('/') && keyword.endsWith('/')) {
      const regexPattern = keyword.slice(1, -1);
      try {
        // 验证正则表达式是否有效
        new RegExp(regexPattern);
      } catch (error) {
        Alert.alert('错误', '正则表达式格式不正确');
        return;
      }
    }

    if (shieldList.has(keyword)) {
      Alert.alert('提示', '该关键词已存在');
      return;
    }

    await storage.addShield(keyword);
    setShieldList(new Set([...shieldList, keyword]));
    setInputText('');
  };

  const handleRemove = async (keyword: string) => {
    Alert.alert('确认', `确定要移除"${keyword}"吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          await storage.removeShield(keyword);
          const newList = new Set(shieldList);
          newList.delete(keyword);
          setShieldList(newList);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <PageHeader title="弹幕屏蔽" />

      <ScrollView style={styles.content}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="请输入关键词或正则表达式"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Icon name="plus" size={20} color="#fff" />
            <Text style={styles.addButtonText}>添加</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          以"/"开头和结尾将视作正则表达式, 如"/\\d+/"表示屏蔽所有数字
        </Text>

        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            已添加{shieldList.size}个关键词（点击移除）
          </Text>
        </View>

        <View style={styles.keywordList}>
          {Array.from(shieldList).map((keyword) => (
            <TouchableOpacity
              key={keyword}
              style={styles.keywordItem}
              onPress={() => handleRemove(keyword)}
            >
              <Text style={styles.keywordText}>{keyword}</Text>
              <Icon name="x" size={16} color="#999" />
            </TouchableOpacity>
          ))}
        </View>

        {shieldList.size === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无屏蔽关键词</Text>
          </View>
        )}
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
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 44,
    backgroundColor: '#3498db',
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  countContainer: {
    marginBottom: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  keywordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  keywordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    gap: 8,
  },
  keywordText: {
    fontSize: 14,
    color: '#333',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});

export default DanmuShieldPage;

