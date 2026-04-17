// 首页 - 带 Tab 切换
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Sites, Site } from '../../app/sites';
import { LocalStorageService } from '../../services/LocalStorageService';
import { useHeaderLayout } from '../../utils/header';
import HomeList from './home-list';

const HomePage = () => {
  const [supportSites, setSupportSites] = useState<Site[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerLayout = useHeaderLayout();

  useEffect(() => {
    loadSiteSort();
  }, []);

  const loadSiteSort = async () => {
    try {
      setLoading(true);
      const storage = LocalStorageService.getInstance();
      const defaultSort = Object.keys(Sites.allSites).join(',');
      const sortStr = await storage.getValue(
        LocalStorageService.kSiteSort,
        defaultSort
      );
      const sort =
        typeof sortStr === 'string' ? sortStr.split(',') : defaultSort.split(',');
      const sites = Sites.getSupportSites(sort);
      setSupportSites(sites);
      // 如果当前选中的站点不在新列表中，重置为第一个
      if (sites.length > 0 && currentIndex >= sites.length) {
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Load site sort error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toSearch = useCallback(() => {
        // @ts-ignore
    navigation.navigate('search');
  }, [navigation]);

  const handleTabPress = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const currentSite = useMemo(() => {
    return supportSites[currentIndex] || null;
  }, [supportSites, currentIndex]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
  );
  }

  if (supportSites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {/* @ts-ignore */}
        <Icon name="tv" size={64} color="#ddd" />
        <Text style={styles.emptyText}>暂无可用平台</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: headerLayout.paddingTop, paddingBottom: 8 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
          contentContainerStyle={[styles.tabContent, { paddingRight: headerLayout.paddingRight }]}
        >
          {supportSites.map((site, index) => (
            <TouchableOpacity
              key={site.id}
              style={[
                styles.tabItem,
                index === currentIndex && styles.tabItemActive,
              ]}
              onPress={() => handleTabPress(index)}
              activeOpacity={0.7}
            >
              {site.logo ? (
                <Image source={site.logo} style={styles.tabIcon} />
              ) : (
                <View style={[styles.tabIcon, styles.tabIconPlaceholder]}>
                  {/* @ts-ignore */}
                  <Icon name="tv" size={16} color="#999" />
                </View>
              )}
              <Text
                style={[
                  styles.tabText,
                  index === currentIndex && styles.tabTextActive,
                ]}
                numberOfLines={1}
              >
                {site.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[styles.searchButton, { marginRight: Math.max(headerLayout.paddingRight, 8) }]}
          onPress={toSearch}
          activeOpacity={0.7}
        >
          {/* @ts-ignore */}
          <Icon name="search" size={20} color="#333" />
        </TouchableOpacity>
      </View>
      {currentSite ? (
        <HomeList key={currentSite.id} site={currentSite} />
      ) : (
        <View style={styles.emptyContainer}>
          {/* @ts-ignore */}
          <Icon name="alert-circle" size={48} color="#ddd" />
          <Text style={styles.emptyText}>加载失败</Text>
        </View>
      )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabContainer: {
    flex: 1,
    minWidth: 0, // 确保可以缩小
  },
  tabContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#f0f7ff',
  },
  tabIcon: {
    width: 24,
    height: 24,
    marginRight: 6,
    borderRadius: 4,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  tabTextActive: {
    color: '#3498db',
    fontWeight: '600',
  },
  searchButton: {
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
  },
  tabIconPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default HomePage;
