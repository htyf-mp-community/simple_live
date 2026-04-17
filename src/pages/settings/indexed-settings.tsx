// 主页设置页面
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import PageHeader from '../../components/PageHeader';
import { LocalStorageService } from '../../services/LocalStorageService';
import { Sites } from '../../app/sites';
import { allHomePages } from '../../app/constants';

const IndexedSettingsPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const storage = LocalStorageService.getInstance();

  const [siteSort, setSiteSort] = useState<string[]>([]);
  const [homeSort, setHomeSort] = useState<string[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const defaultSiteSort = Object.keys(Sites.allSites).join(',');
    const siteSortStr = await storage.getValue(
      LocalStorageService.kSiteSort,
      defaultSiteSort
    );
    const sites = typeof siteSortStr === 'string' ? siteSortStr.split(',') : defaultSiteSort.split(',');
    setSiteSort(sites.filter(key => Sites.allSites[key]));

    const defaultHomeSort = Object.keys(allHomePages).join(',');
    const homeSortStr = await storage.getValue(
      LocalStorageService.kHomeSort,
      defaultHomeSort
    );
    const homes = typeof homeSortStr === 'string' ? homeSortStr.split(',') : defaultHomeSort.split(',');
    setHomeSort(homes.filter(key => allHomePages[key]));
  };

  const updateSiteSort = async (oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    
    const newSort = [...siteSort];
    const [removed] = newSort.splice(oldIndex, 1);
    newSort.splice(newIndex, 0, removed);
    
    setSiteSort(newSort);
    await storage.setValue(LocalStorageService.kSiteSort, newSort.join(','));
    Alert.alert('提示', '平台排序已更新，重启应用后生效');
  };

  const updateHomeSort = async (oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    
    const newSort = [...homeSort];
    const [removed] = newSort.splice(oldIndex, 1);
    newSort.splice(newIndex, 0, removed);
    
    setHomeSort(newSort);
    await storage.setValue(LocalStorageService.kHomeSort, newSort.join(','));
    Alert.alert('提示', '主页排序已更新，重启应用后生效');
  };

  const moveItem = (array: string[], index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= array.length) return;
    
    if (array === siteSort) {
      updateSiteSort(index, newIndex);
    } else {
      updateHomeSort(index, newIndex);
    }
  };

  const renderSortableList = (
    items: string[],
    getLabel: (key: string) => string,
    getIcon: (key: string) => string,
    onMove: (oldIndex: number, newIndex: number) => void
  ) => {
    return items.map((key, index) => (
      <View key={key} style={styles.sortItem}>
        <View style={styles.sortItemContent}>
          <Icon name={getIcon(key)} size={20} color="#333" />
          <Text style={styles.sortItemText}>{getLabel(key)}</Text>
        </View>
        <View style={styles.sortItemActions}>
          <TouchableOpacity
            style={[styles.sortButton, index === 0 && styles.sortButtonDisabled]}
            onPress={() => moveItem(items, index, 'up')}
            disabled={index === 0}
          >
            <Icon name="chevron-up" size={20} color={index === 0 ? '#ccc' : '#666'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, index === items.length - 1 && styles.sortButtonDisabled]}
            onPress={() => moveItem(items, index, 'down')}
            disabled={index === items.length - 1}
          >
            <Icon name="chevron-down" size={20} color={index === items.length - 1 ? '#ccc' : '#666'} />
          </TouchableOpacity>
        </View>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <PageHeader title="主页设置" />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>主页排序 (长按拖动排序，重启后生效)</Text>
          <View style={styles.card}>
            {renderSortableList(
              homeSort,
              (key) => allHomePages[key]?.title || key,
              (key) => allHomePages[key]?.iconName || 'circle',
              updateHomeSort
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>平台排序 (长按拖动排序，重启后生效)</Text>
          <View style={styles.card}>
            {renderSortableList(
              siteSort,
              (key) => Sites.allSites[key]?.name || key,
              () => 'tv',
              updateSiteSort
            )}
          </View>
        </View>
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
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sortItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sortItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  sortItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    padding: 4,
  },
  sortButtonDisabled: {
    opacity: 0.3,
  },
});

export default IndexedSettingsPage;

