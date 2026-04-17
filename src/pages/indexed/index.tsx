// 主入口页面 - 底部导航
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { allHomePages } from '../../app/constants';
import { LocalStorageService } from '../../services/LocalStorageService';
import HomePage from '../home';
import FollowUserPage from '../follow-user';
import CategoryPage from '../category';
import MinePage from '../mine';

const Tab = createBottomTabNavigator();

const IndexedPage = () => {
  // 使用默认值初始化，避免空数组导致没有屏幕
  const defaultSort = Object.keys(allHomePages);
  const [homeSort, setHomeSort] = useState<string[]>(defaultSort);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadHomeSort();
  }, []);

  const loadHomeSort = async () => {
    const storage = LocalStorageService.getInstance();
    const defaultSortStr = Object.keys(allHomePages).join(',');
    const sortStr = await storage.getValue(
      LocalStorageService.kHomeSort,
      defaultSortStr
    );
    const sort = typeof sortStr === 'string' ? sortStr.split(',') : defaultSortStr.split(',');
    // 确保所有必需的页面都在列表中
    const allKeys = Object.keys(allHomePages);
    const validSort = sort.filter(key => allKeys.includes(key));
    // 添加缺失的页面
    allKeys.forEach(key => {
      if (!validSort.includes(key)) {
        validSort.push(key);
      }
    });
    setHomeSort(validSort);
  };

  const getTabItems = () => {
    return homeSort
      .map((key) => allHomePages[key])
      .filter(Boolean)
      .map((item) => ({
        key: item.title,
        title: item.title,
        icon: item.iconName,
        index: item.index,
      }));
  };

  const tabItems = getTabItems();

  // 如果没有 tab items，显示加载状态
  if (tabItems.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        {/* 可以添加加载指示器 */}
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          height: (Platform.OS === 'ios' ? 60 : 50) + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
      }}
    >
      {tabItems.map((item) => {
        let component;
        switch (item.index) {
          case 0:
            component = HomePage;
            break;
          case 1:
            component = FollowUserPage;
            break;
          case 2:
            component = CategoryPage;
            break;
          case 3:
            component = MinePage;
            break;
          default:
            component = HomePage;
        }

        return (
          <Tab.Screen
            key={item.key}
            name={item.key}
            component={component}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Icon name={item.icon} size={size} color={color} />
              ),
              tabBarLabel: item.title,
            }}
          />
        );
      })}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default IndexedPage;

