// 搜索页面
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sites, Site } from '../../app/sites';
import { useHeaderLayout } from '../../utils/header';
import { LocalStorageService } from '../../services/LocalStorageService';
import LiveRoomCard from '../../components/live-room-card';
import { LiveRoomItem } from '../home/core/model/liveRoomItem';
import { LiveSearchResult } from '../home/core/model/liveSearchResult';

const SearchPage = () => {
  const [supportSites, setSupportSites] = useState<Site[]>([]);
  const [currentSiteIndex, setCurrentSiteIndex] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<LiveRoomItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerLayout = useHeaderLayout();

  React.useEffect(() => {
    loadSiteSort();
  }, []);

  const loadSiteSort = async () => {
    const storage = LocalStorageService.getInstance();
    const defaultSort = Object.keys(Sites.allSites).join(',');
    const sortStr = await storage.getValue(
      LocalStorageService.kSiteSort,
      defaultSort
    );
    const sort = typeof sortStr === 'string' ? sortStr.split(',') : defaultSort.split(',');
    const sites = Sites.getSupportSites(sort);
    setSupportSites(sites);
  };

  const handleSearch = useCallback(async () => {
    if (!searchText.trim() || supportSites.length === 0) {
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);

    try {
      const currentSite = supportSites[currentSiteIndex];
      const result: LiveSearchResult = await currentSite.liveSite.searchRooms(
        searchText.trim(),
        1
      );
      setResults(result.items);
    } catch (error: any) {
      console.error('Search error:', error);
      const errorMessage = error?.message || '搜索失败，请稍后重试';
      // 显示错误提示（如果需要的话，可以添加 Toast 或 Alert）
      console.warn('搜索错误:', errorMessage);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchText, currentSiteIndex, supportSites]);

  const handleCardPress = useCallback((item: LiveRoomItem) => {
    const currentSite = supportSites[currentSiteIndex];
    // @ts-ignore
    navigation.navigate('RoomPlayer', {
      site_id: currentSite.id,
      roomId: item.roomId,
    });
  }, [navigation, currentSiteIndex, supportSites]);

  const renderItem = ({ item }: { item: LiveRoomItem }) => {
    const currentSite = supportSites[currentSiteIndex];
    return (
      <View style={styles.itemContainer}>
        <LiveRoomCard
          site={currentSite}
          item={item}
          onPress={() => handleCardPress(item)}
        />
      </View>
    );
  };

  const currentSite = supportSites[currentSiteIndex];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: headerLayout.paddingTop, paddingBottom: 8 }]}>
        <View style={[styles.searchContainer, { paddingRight: headerLayout.paddingRight }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="搜索直播间..."
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
          >
            <Text style={styles.searchButtonText}>搜索</Text>
          </TouchableOpacity>
        </View>
      </View>

      {supportSites.length > 1 && (
        <View style={styles.tabContainer}>
          {supportSites.map((site, index) => (
            <TouchableOpacity
              key={site.id}
              style={[
                styles.tabItem,
                index === currentSiteIndex && styles.tabItemActive,
              ]}
              onPress={() => {
                setCurrentSiteIndex(index);
                setHasSearched(false);
                setResults([]);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  index === currentSiteIndex && styles.tabTextActive,
                ]}
              >
                {site.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : hasSearched ? (
        results.length > 0 ? (
          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item) => item.roomId}
            numColumns={2}
            contentContainerStyle={styles.list}
            key={2} // 固定列数
          />
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>未找到相关直播间</Text>
          </View>
        )
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.hintText}>输入关键词搜索直播间</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    minWidth: 0, // 确保可以缩小
  },
  searchButton: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#3498db',
    borderRadius: 8,
    height: 40,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#3498db',
    fontWeight: '500',
  },
  list: {
    padding: 12,
  },
  itemContainer: {
    flex: 1,
    margin: 6,
    maxWidth: '48%',
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
  hintText: {
    fontSize: 16,
    color: '#999',
  },
});

export default SearchPage;

