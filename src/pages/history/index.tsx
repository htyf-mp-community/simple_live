// 观看记录页面
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
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import PageHeader from '../../components/PageHeader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Feather';
import { Image } from 'react-native';
import { DBService } from '../../services/DBService';
import { History } from '../../models/History';
import { Sites } from '../../app/sites';
import { Utils } from '../../utils';
import NetImage from '../../components/net-image';

const HistoryPage = () => {
  const [historyList, setHistoryList] = useState<History[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const db = DBService.getInstance();

  const crossAxisCount = Math.max(1, Math.floor(Dimensions.get('window').width / 500));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await db.getHistoryList();
      setHistoryList(list);
    } catch (error) {
      console.error('Load history error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClean = async () => {
    const result = await Utils.showAlertDialog(
      '确定要清空观看记录吗?',
      { title: '清空观看记录' }
    );
    if (!result) return;

    await db.clearHistory();
    setHistoryList([]);
  };

  const handleRemoveItem = async (item: History) => {
    await db.deleteHistory(item.id);
    await loadData();
  };

  const handleItemPress = (item: History) => {
    const site = Sites.allSites[item.siteId];
    if (site) {
      // @ts-ignore
      navigation.navigate('RoomPlayer', {
        site_id: site.id,
        roomId: item.roomId,
      });
    }
  };

  const renderRightActions = (item: History) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={async () => {
          const result = await Utils.showAlertDialog(
            '确定要删除此记录吗?',
            { title: '删除记录' }
          );
          if (result) {
            await handleRemoveItem(item);
          }
        }}
      >
        <Icon name="trash-2" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: History }) => {
    const site = Sites.allSites[item.siteId];
    
    if (crossAxisCount > 1) {
      // 网格布局
      return (
        <TouchableOpacity
          style={styles.gridItem}
          onPress={() => handleItemPress(item)}
          onLongPress={async () => {
            const result = await Utils.showAlertDialog(
              '确定要删除此记录吗?',
              { title: '删除记录' }
            );
            if (result) {
              await handleRemoveItem(item);
            }
          }}
        >
          <NetImage
            picUrl={item.face}
            width={80}
            height={80}
            borderRadius={40}
          />
          <Text style={styles.gridUserName} numberOfLines={1}>
            {item.userName}
          </Text>
          {site && (
            <View style={styles.gridSiteInfo}>
              <Image source={site.logo} style={styles.gridSiteLogo} />
              <Text style={styles.gridSiteName} numberOfLines={1}>
                {site.name}
              </Text>
            </View>
          )}
          <Text style={styles.gridTime}>
            {Utils.parseTime(new Date(item.updateTime))}
          </Text>
        </TouchableOpacity>
      );
    }

    // 列表布局
    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => handleItemPress(item)}
          onLongPress={async () => {
            const result = await Utils.showAlertDialog(
              '确定要删除此记录吗?',
              { title: '删除记录' }
            );
            if (result) {
              await handleRemoveItem(item);
            }
          }}
        >
          <NetImage
            picUrl={item.face}
            width={48}
            height={48}
            borderRadius={24}
          />
          <View style={styles.listItemContent}>
            <Text style={styles.listUserName} numberOfLines={1}>
              {item.userName}
            </Text>
            <View style={styles.listSubtitle}>
              {site && (
                <View style={styles.siteInfo}>
                  <Image source={site.logo} style={styles.siteLogo} />
                  <Text style={styles.siteName} numberOfLines={1}>
                    {site.name}
                  </Text>
                </View>
              )}
              <Text style={styles.time}>
                {Utils.parseTime(new Date(item.updateTime))}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <PageHeader
        title="观看记录"
        rightContent={
          <TouchableOpacity
            style={styles.cleanButton}
            onPress={handleClean}
          >
            <Icon name="trash-2" size={20} color="#333" />
            <Text style={styles.cleanButtonText}>清空</Text>
          </TouchableOpacity>
        }
      />

      {loading && historyList.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : historyList.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>暂无观看记录</Text>
        </View>
      ) : (
        <FlatList
          data={historyList}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={crossAxisCount}
          contentContainerStyle={styles.list}
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
        />
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cleanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cleanButtonText: {
    fontSize: 16,
    color: '#333',
  },
  list: {
    padding: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listUserName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  listSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  siteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  siteLogo: {
    width: 20,
    height: 20,
    marginRight: 4,
  },
  siteName: {
    fontSize: 12,
    color: '#999',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    margin: 6,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  gridUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  gridSiteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridSiteLogo: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  gridSiteName: {
    fontSize: 12,
    color: '#999',
  },
  gridTime: {
    fontSize: 12,
    color: '#999',
  },
  deleteAction: {
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default HistoryPage;

