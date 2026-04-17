// 分类详情页面
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { Site } from '../../app/sites';
import { LiveSubCategory } from '../home/core/model/liveCategory';
import { LiveRoomItem } from '../home/core/model/liveRoomItem';
import LiveRoomCard from '../../components/live-room-card';

type CategoryDetailRouteParams = {
  site: Site;
  category: LiveSubCategory;
};

const CategoryDetailPage = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: CategoryDetailRouteParams }, 'params'>>();
  const insets = useSafeAreaInsets();
  const { site, category } = route.params || {};

  const [rooms, setRooms] = useState<LiveRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 计算网格列数
  const crossAxisCount = Math.max(2, Math.floor(Dimensions.get('window').width / 200));
  const itemWidth = (Dimensions.get('window').width - 24 - (crossAxisCount - 1) * 12) / crossAxisCount;

  const loadData = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (!site || !category) return;

      try {
        setError(null);
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result = await site.liveSite.getCategoryRooms(category, pageNum);

        if (!result || !result.items) {
          console.warn('Invalid result from getCategoryRooms:', result);
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
        console.error('Load category rooms error:', err);
        if (isRefresh) {
          setRooms([]);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [site, category]
  );

  useEffect(() => {
    if (site && category) {
      loadData(1, true);
    }
  }, [site, category, loadData]);

  const onRefresh = useCallback(() => {
    loadData(1, true);
  }, [loadData]);

  const onEndReached = useCallback(() => {
    if (!loading && hasMore && !refreshing && site && category) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage, false);
    }
  }, [loading, hasMore, refreshing, page, loadData, site, category]);

  const handleCardPress = useCallback(
    (item: LiveRoomItem) => {
      if (!site) return;
      // @ts-ignore
      navigation.navigate('RoomPlayer', {
        site_id: site.id,
        roomId: item.roomId,
      });
    },
    [navigation, site]
  );

  const renderItem = ({ item }: { item: LiveRoomItem }) => (
    <View style={[styles.itemContainer, { width: itemWidth }]}>
      <LiveRoomCard site={site!} item={item} onPress={() => handleCardPress(item)} />
    </View>
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
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadData(1, true)}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暂无直播间</Text>
      </View>
    );
  };

  if (!site || !category) {
    return (
      <View style={styles.container}>
        <PageHeader title="分类详情" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>参数错误</Text>
        </View>
      </View>
    );
  }

  if (loading && rooms.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{category.name}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title={category.name} />

      <FlatList
        data={rooms}
        renderItem={renderItem}
        keyExtractor={(item) => item.roomId}
        numColumns={crossAxisCount}
        contentContainerStyle={styles.listContent}
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
        showsVerticalScrollIndicator={false}
      />
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
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemContainer: {
    marginBottom: 12,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3498db',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CategoryDetailPage;

