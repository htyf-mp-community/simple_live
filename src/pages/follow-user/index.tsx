// 关注用户页面
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { FollowService } from '../../services/FollowService';
import { DBService } from '../../services/DBService';
import { FollowUser, FollowUserTag } from '../../models/FollowUser';
import { Sites } from '../../app/sites';
import { Utils } from '../../utils';
import FollowUserItem from '../../components/follow-user-item';
import FilterButton from '../../components/filter-button';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const FollowUserPage = () => {
  const [followList, setFollowList] = useState<FollowUser[]>([]);
  const [tagList, setTagList] = useState<FollowUserTag[]>([]);
  const [userTagList, setUserTagList] = useState<FollowUserTag[]>([]);
  const [filterMode, setFilterMode] = useState<FollowUserTag>({
    id: '0',
    tag: '全部',
    userId: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showSetTagDialog, setShowSetTagDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<FollowUserTag | null>(null);
  const [tagName, setTagName] = useState('');
  const [currentSettingItem, setCurrentSettingItem] = useState<FollowUser | null>(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const followService = FollowService.getInstance();
  const db = DBService.getInstance();

  // 默认标签
  const defaultTags: FollowUserTag[] = [
    { id: '0', tag: '全部', userId: [] },
    { id: '1', tag: '直播中', userId: [] },
    { id: '2', tag: '未开播', userId: [] },
  ];

  useEffect(() => {
    loadData();
    
    // 监听更新事件
    const onUpdated = () => {
      filterData();
    };
    followService.on('updated', onUpdated);

    return () => {
      followService.off('updated', onUpdated);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await followService.loadData();
      updateTagList();
      filterData();
    } catch (error) {
      console.error('Load follow data error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateTagList = () => {
    setUserTagList(followService.followTagList);
    const allTags = [...defaultTags, ...followService.followTagList];
    setTagList(allTags);
  };

  const filterData = () => {
    let filtered: FollowUser[] = [];
    
    if (filterMode.tag === '全部') {
      filtered = followService.followList;
    } else if (filterMode.tag === '直播中') {
      filtered = followService.liveList;
    } else if (filterMode.tag === '未开播') {
      filtered = followService.notLiveList;
    } else {
      followService.filterDataByTag(filterMode);
      filtered = followService.curTagFollowList;
    }
    
    setFollowList(filtered);
  };

  const handleFilterChange = (tag: FollowUserTag) => {
    setFilterMode(tag);
  };

  useEffect(() => {
    filterData();
  }, [filterMode]);

  const handleRemoveItem = async (item: FollowUser) => {
    const result = await Utils.showAlertDialog(
      `确定要取消关注${item.userName}吗?`,
      { title: '取消关注' }
    );
    
    if (!result) return;

    // 从标签中移除
    if (item.tag !== '全部') {
      const tag = tagList.find(t => t.tag === item.tag);
      if (tag) {
        tag.userId = tag.userId.filter(id => id !== item.id);
        await db.updateFollowTag(tag);
      }
    }

    await db.deleteFollow(item.id);
    await loadData();
  };

  const handleItemPress = (item: FollowUser) => {
    const site = Sites.allSites[item.siteId];
    if (site) {
      // @ts-ignore
      navigation.navigate('RoomPlayer', {
        site_id: site.id,
        roomId: item.roomId,
      });
    }
  };

  const handleSetTag = async (item: FollowUser, targetTag: FollowUserTag) => {
    const curTag = tagList.find(t => t.tag === item.tag);
    if (curTag && curTag.id !== '0') {
      curTag.userId = curTag.userId.filter(id => id !== item.id);
      await db.updateFollowTag(curTag);
    }

    if (targetTag.id !== '0') {
      if (!targetTag.userId.includes(item.id)) {
        targetTag.userId.push(item.id);
      }
      await db.updateFollowTag(targetTag);
    }

    item.tag = targetTag.tag;
    await db.addFollow(item);
    await loadData();
  };

  const handleAddTag = async () => {
    if (!tagName.trim()) return;

    try {
      await followService.addFollowUserTag(tagName.trim());
      setTagName('');
      setShowTagDialog(false);
      updateTagList();
    } catch (error: any) {
      Alert.alert('错误', error.message || '添加标签失败');
    }
  };

  const handleDeleteTag = async (tag: FollowUserTag) => {
    const result = await Utils.showAlertDialog(
      `确定要删除标签"${tag.tag}"吗？标签下的关注将移至"全部"`,
      { title: '删除标签' }
    );
    if (!result) return;

    // 将标签下的所有关注设置为"全部"
    for (const id of tag.userId) {
      const follow = await db.getFollow(id);
      if (follow) {
        follow.tag = '全部';
        await db.addFollow(follow);
      }
    }
    await followService.delFollowUserTag(tag);
    updateTagList();
    if (filterMode.id === tag.id) {
      setFilterMode(defaultTags[0]);
    }
  };

  const handleEditTag = (tag: FollowUserTag) => {
    setEditingTag(tag);
    setTagName(tag.tag);
    setShowTagDialog(true);
  };

  const showSetTagDialogForItem = (item: FollowUser) => {
    setCurrentSettingItem(item);
    setShowSetTagDialog(true);
  };

  const handleSetItemTag = async (targetTag: FollowUserTag) => {
    if (!currentSettingItem) return;
    await handleSetTag(currentSettingItem, targetTag);
    setShowSetTagDialog(false);
    setCurrentSettingItem(null);
  };

  const handleUpdateTagName = async () => {
    if (!editingTag || !tagName.trim()) return;

    if (tagList.some(t => t.tag === tagName.trim() && t.id !== editingTag.id)) {
      Alert.alert('错误', '标签名重复');
      return;
    }

    const newTag = { ...editingTag, tag: tagName.trim() };
    followService.updateFollowUserTag(newTag);

    // 更新所有使用该标签的关注
    for (const id of newTag.userId) {
      const follow = await db.getFollow(id);
      if (follow) {
        follow.tag = newTag.tag;
        await db.addFollow(follow);
      }
    }

    setTagName('');
    setEditingTag(null);
    setShowTagDialog(false);
    updateTagList();
  };

  const renderItem = ({ item }: { item: FollowUser }) => {
    const site = Sites.allSites[item.siteId];
    return (
      <FollowUserItem
        item={item}
        onTap={() => handleItemPress(item)}
        onRemove={() => handleRemoveItem(item)}
        onLongPress={() => {
          showSetTagDialogForItem(item);
        }}
      />
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Icon name="users" size={64} color="#ddd" />
        <Text style={styles.emptyTitle}>暂无关注用户</Text>
        <Text style={styles.emptySubtitle}>
          {filterMode.tag === '全部'
            ? '快去关注你喜欢的主播吧'
            : `当前标签下暂无用户`}
        </Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <PageHeader
        title="关注用户"
        rightContent={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowTagManager(true)}
            >
              <Icon name="tag" size={20} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={loadData}
              disabled={followService.updating}
            >
              {followService.updating ? (
                <ActivityIndicator size="small" color="#3498db" />
              ) : (
                <Icon name="refresh-cw" size={20} color="#333" />
              )}
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {tagList.map((tag) => (
            <FilterButton
              key={tag.id}
              text={tag.tag}
              selected={filterMode.id === tag.id}
              onTap={() => handleFilterChange(tag)}
            />
          ))}
        </ScrollView>
      </View>

      {loading && followList.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : (
        <FlatList
          data={followList}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={['#3498db']}
              tintColor="#3498db"
            />
          }
          contentContainerStyle={
            followList.length === 0 ? styles.emptyListContent : undefined
          }
        />
      )}

      {/* 标签管理 Modal */}
      <Modal
        visible={showTagManager}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTagManager(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>标签管理</Text>
              <TouchableOpacity
                onPress={() => setShowTagManager(false)}
                style={styles.closeButton}
              >
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.tagList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.addTagButton}
                onPress={() => {
                  setEditingTag(null);
                  setTagName('');
                  setShowTagDialog(true);
                }}
              >
                <View style={styles.addTagIcon}>
                  <Icon name="plus" size={20} color="#3498db" />
                </View>
                <Text style={styles.addTagText}>添加标签</Text>
              </TouchableOpacity>
              {userTagList.map((tag) => (
                <View key={tag.id} style={styles.tagItem}>
                  <View style={styles.tagItemLeft}>
                    <Icon name="tag" size={16} color="#666" />
                    <Text style={styles.tagItemText}>{tag.tag}</Text>
                    <Text style={styles.tagItemCount}>({tag.userId.length})</Text>
                  </View>
                  <View style={styles.tagActions}>
                    <TouchableOpacity
                      onPress={() => handleEditTag(tag)}
                      style={styles.tagActionButton}
                    >
                      <Icon name="edit-2" size={18} color="#3498db" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteTag(tag)}
                      style={styles.tagActionButton}
                    >
                      <Icon name="trash-2" size={18} color="#f44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {userTagList.length === 0 && (
                <View style={styles.emptyTagContainer}>
                  <Icon name="tag" size={48} color="#ddd" />
                  <Text style={styles.emptyTagText}>暂无自定义标签</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 添加/编辑标签对话框 */}
      <Modal
        visible={showTagDialog}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowTagDialog(false);
          setEditingTag(null);
          setTagName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>
              {editingTag ? '修改标签' : '添加标签'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="请输入标签名"
              placeholderTextColor="#999"
              value={tagName}
              onChangeText={setTagName}
              autoFocus
              maxLength={20}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => {
                  setShowTagDialog(false);
                  setEditingTag(null);
                  setTagName('');
                }}
              >
                <Text style={styles.dialogButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonPrimary]}
                onPress={editingTag ? handleUpdateTagName : handleAddTag}
                disabled={!tagName.trim()}
              >
                <Text
                  style={[
                    styles.dialogButtonText,
                    styles.dialogButtonTextPrimary,
                  ]}
                >
                  确定
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 设置标签对话框 */}
      <Modal
        visible={showSetTagDialog}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowSetTagDialog(false);
          setCurrentSettingItem(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>
              为 {currentSettingItem?.userName} 设置标签
            </Text>
            <ScrollView
              style={styles.tagSelectList}
              showsVerticalScrollIndicator={false}
            >
              {tagList
                .filter((tag) => tag.id !== '0') // 排除"全部"
                .map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagSelectItem,
                      currentSettingItem?.tag === tag.tag &&
                        styles.tagSelectItemActive,
                    ]}
                    onPress={() => handleSetItemTag(tag)}
                  >
                    <View style={styles.tagSelectItemLeft}>
                      <Icon
                        name="tag"
                        size={16}
                        color={
                          currentSettingItem?.tag === tag.tag
                            ? '#3498db'
                            : '#666'
                        }
                      />
                      <Text
                        style={[
                          styles.tagSelectItemText,
                          currentSettingItem?.tag === tag.tag &&
                            styles.tagSelectItemTextActive,
                        ]}
                      >
                        {tag.tag}
                      </Text>
                    </View>
                    {currentSettingItem?.tag === tag.tag && (
                      <Icon name="check" size={20} color="#3498db" />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => {
                  setShowSetTagDialog(false);
                  setCurrentSettingItem(null);
                }}
              >
                <Text style={styles.dialogButtonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  filterWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
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
    maxHeight: '80%',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  tagList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3498db',
    borderStyle: 'dashed',
  },
  addTagIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addTagText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  tagItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  tagItemCount: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  tagActions: {
    flexDirection: 'row',
    gap: 12,
  },
  tagActionButton: {
    padding: 8,
  },
  emptyTagContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTagText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  dialogContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
    width: '90%',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  dialogButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  dialogButtonPrimary: {
    backgroundColor: '#3498db',
  },
  dialogButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  dialogButtonTextPrimary: {
    color: '#fff',
  },
  tagSelectList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  tagSelectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  tagSelectItemActive: {
    backgroundColor: '#e3f2fd',
  },
  tagSelectItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagSelectItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  tagSelectItemTextActive: {
    color: '#3498db',
    fontWeight: '500',
  },
});

export default FollowUserPage;
