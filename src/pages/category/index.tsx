// 分类页面 - 带 Tab 切换
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Sites, Site } from '../../app/sites';
import { LocalStorageService } from '../../services/LocalStorageService';
import { useHeaderLayout } from '../../utils/header';
import CategoryList from './category-list';

const CategoryPage = () => {
  const [supportSites, setSupportSites] = useState<Site[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const headerLayout = useHeaderLayout();

  useEffect(() => {
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

  if (supportSites.length === 0) {
    return <View style={styles.container} />;
  }

  const currentSite = supportSites[currentIndex];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: headerLayout.paddingTop, paddingBottom: 8 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
          contentContainerStyle={styles.tabContent}
        >
          {supportSites.map((site, index) => (
            <TouchableOpacity
              key={site.id}
              style={[
                styles.tabItem,
                index === currentIndex && styles.tabItemActive,
              ]}
              onPress={() => setCurrentIndex(index)}
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
      </View>
      {currentSite && <CategoryList site={currentSite} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    marginRight: 8,
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
  tabIconPlaceholder: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
});

export default CategoryPage;

