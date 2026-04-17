// 分类列表组件
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Site } from '../../app/sites';
import { LiveCategory, LiveSubCategory } from '../home/core/model/liveCategory';
import NetImage from '../../components/net-image';

interface CategoryListProps {
  site: Site;
}

// 子分类项组件 - 使用 memo 优化性能
const SubCategoryItem = React.memo<{
  subCategory: LiveSubCategory;
  onPress: () => void;
}>(({ subCategory, onPress }) => (
  <TouchableOpacity style={styles.subCategoryItem} onPress={onPress}>
    {subCategory.pic && (
      <NetImage
        picUrl={subCategory.pic}
        width={40}
        height={40}
        borderRadius={8}
      />
    )}
    <Text style={styles.subCategoryName} numberOfLines={1}>
      {subCategory.name}
    </Text>
  </TouchableOpacity>
));

SubCategoryItem.displayName = 'SubCategoryItem';

// 分类项组件 - 使用 memo 优化性能
const CategoryItem = React.memo<{
  category: LiveCategory;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSubCategoryPress: (subCategory: LiveSubCategory) => void;
}>(({ category, isExpanded, onToggleExpand, onSubCategoryPress }) => {
  const children = category.children || [];
  const displayChildren = useMemo(
    () => (isExpanded ? children : children.slice(0, 15)),
    [children, isExpanded]
  );
  const hasMore = children.length > 15;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryTitle}>{category.name}</Text>
      </View>
      {children.length > 0 ? (
        <View style={styles.subCategoryGrid}>
          {displayChildren.map((subCategory) => (
            <SubCategoryItem
              key={subCategory.id}
              subCategory={subCategory}
              onPress={() => onSubCategoryPress(subCategory)}
            />
          ))}
          {!isExpanded && hasMore && (
            <TouchableOpacity
              style={[styles.subCategoryItem, styles.showMoreItem]}
              onPress={onToggleExpand}
            >
              <Text style={styles.showMoreText}>显示全部</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>暂无子分类</Text>
        </View>
      )}
    </View>
  );
});

CategoryItem.displayName = 'CategoryItem';

const CategoryList: React.FC<CategoryListProps> = ({ site }) => {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const cats = await site.liveSite.getCategories();
      setCategories(cats as LiveCategory[]);
    } catch (err: any) {
      const errorMessage = err?.message || '加载分类失败';
      setError(errorMessage);
      console.error('Load categories error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [site.liveSite]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSubCategoryPress = useCallback(
    (category: LiveCategory, subCategory: LiveSubCategory) => {
      // @ts-ignore - React Navigation 类型定义问题
      navigation.navigate('CategoryDetail', {
        site: site,
        category: subCategory,
      });
    },
    [navigation, site]
  );

  const toggleCategoryExpanded = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  // 加载状态
  if (loading && categories.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  // 错误状态
  if (error && categories.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadData}
        >
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 空状态
  if (!loading && categories.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>暂无分类数据</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3498db']}
          tintColor="#3498db"
        />
      }
    >
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          isExpanded={expandedCategories[category.id] || false}
          onToggleExpand={() => toggleCategoryExpanded(category.id)}
          onSubCategoryPress={(subCategory) =>
            handleSubCategoryPress(category, subCategory)
          }
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 16,
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
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    paddingVertical: 8,
    paddingLeft: 4,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  subCategoryItem: {
    width: '12.5%',
    minWidth: 80,
    maxWidth: 100,
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
  },
  subCategoryName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  showMoreItem: {
    justifyContent: 'center',
  },
  showMoreText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#3498db',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});

export default CategoryList;
