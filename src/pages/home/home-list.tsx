// 首页列表组件
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  RefreshControl,
  FlatList,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import LiveRoomCard from '../../components/live-room-card';
import { LiveRoomItem } from './core/model/liveRoomItem';
import { Site } from '../../app/sites';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

interface HomeListProps {
  site: Site;
}

const HomeList: React.FC<HomeListProps> = ({ site }) => {
  const [rooms, setRooms] = useState<LiveRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  const crossAxisCount = useMemo(
    () => Math.max(2, Math.floor(Dimensions.get('window').width / 200)),
    []
  );

  const itemWidth = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const padding = 12 * 2; // 左右 padding
    const gap = 12 * (crossAxisCount - 1); // 列间距
    return (screenWidth - padding - gap) / crossAxisCount;
  }, [crossAxisCount]);

  const loadData = useCallback(
    async (pageNum: number, isRefresh = false) => {
      try {
        setError(null);
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result = await site.liveSite.getRecommendRooms(pageNum);

        if (!result || !result.items) {
          console.warn('Invalid result from getRecommendRooms:', result);
          if (isRefresh) {
            setRooms([]);
          }
          setHasMore(false);
          return;
        }

        if (isRefresh) {
          setRooms(result.items || []);
          setPage(1);
        } else {
          setRooms((prev) => [...prev, ...(result.items || [])]);
        }

        setHasMore(
          result.hasMore !== false && (result.items?.length || 0) > 0
        );
      } catch (err: any) {
        const errorMessage = err?.message || '加载失败';
        setError(errorMessage);
        console.error('Load home list error:', err);
        if (isRefresh) {
          setRooms([]);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [site.liveSite]
  );

  useEffect(() => {
    loadData(1, true);
  }, [loadData]);

  const onRefresh = useCallback(() => {
    loadData(1, true);
  }, [loadData]);

  const onEndReached = useCallback(() => {
    if (!loading && hasMore && !refreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage, false);
    }
  }, [loading, hasMore, refreshing, page, loadData]);

  const handleCardPress = useCallback(
    (item: LiveRoomItem) => {
      // @ts-ignore
      navigation.navigate('RoomPlayer', {
        site_id: site.id,
        roomId: item.roomId,
      });
    },
    [navigation, site.id]
  );

  const renderItem = useCallback(
    ({ item }: { item: LiveRoomItem }) => (
      <View style={[styles.itemContainer, { width: itemWidth }]}>
        <LiveRoomCard
          site={site}
          item={item}
          onPress={() => handleCardPress(item)}
        />
      </View>
    ),
    [site, handleCardPress, itemWidth]
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3498db" />
        <Text style={styles.footerText}>加载中...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle" size={48} color="#ddd" />
          <Text style={styles.emptyTitle}>加载失败</Text>
          <Text style={styles.emptyMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadData(1, true)}
          >
            <Icon name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Icon name="tv" size={48} color="#ddd" />
        <Text style={styles.emptyTitle}>暂无直播间</Text>
        <Text style={styles.emptyMessage}>下拉刷新试试</Text>
      </View>
    );
  };

  if (loading && rooms.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rooms}
      renderItem={renderItem}
      keyExtractor={(item) => item.roomId}
      numColumns={crossAxisCount}
      contentContainerStyle={
        rooms.length === 0 ? styles.emptyListContent : styles.list
      }
      columnWrapperStyle={styles.row}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3498db']}
          tintColor="#3498db"
        />
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      key={crossAxisCount}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemContainer: {
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
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
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3498db',
    borderRadius: 8,
    gap: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});

export default HomeList;
