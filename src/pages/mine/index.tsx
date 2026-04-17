// 我的页面
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

const MinePage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Simple Live</Text>
        <Text style={styles.subtitle}>简简单单看直播</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('History');
          }}
        >
          <Icon name="clock" size={24} color="#333" />
          <Text style={styles.menuText}>观看记录</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('Account');
          }}
        >
          <Icon name="user" size={24} color="#333" />
          <Text style={styles.menuText}>账号管理</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('Sync');
          }}
        >
          <Icon name="refresh-cw" size={24} color="#333" />
          <Text style={styles.menuText}>数据同步</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('Parse');
          }}
        >
          <Icon name="link" size={24} color="#333" />
          <Text style={styles.menuText}>链接解析</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('AppStyleSetting');
          }}
        >
          <Icon name="moon" size={24} color="#333" />
          <Text style={styles.menuText}>外观设置</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('IndexedSettings');
          }}
        >
          <Icon name="grid" size={24} color="#333" />
          <Text style={styles.menuText}>主页设置</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('PlaySettings');
          }}
        >
          <Icon name="play-circle" size={24} color="#333" />
          <Text style={styles.menuText}>直播设置</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('FollowSettings');
          }}
        >
          <Icon name="heart" size={24} color="#333" />
          <Text style={styles.menuText}>关注设置</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('AutoExitSettings');
          }}
        >
          <Icon name="timer" size={24} color="#333" />
          <Text style={styles.menuText}>定时关闭</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // @ts-ignore
            navigation.navigate('OtherSettings');
          }}
        >
          <Icon name="settings" size={24} color="#333" />
          <Text style={styles.menuText}>其他设置</Text>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
});

export default MinePage;

