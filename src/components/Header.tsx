import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import jssdk from '@htyf-mp/js-sdk';
import { useNavigation } from '@react-navigation/native';

const Header = ({ title }: { title: string }) => {
  const navigation = useNavigation();
  const mu = useMemo(() => {
    const d = jssdk.getMenuButtonBoundingClientRect();
    return d;
  }, []);
  const width = useMemo(() => {
    return mu.width + mu.right + 10;
  }, [mu]);
  return (
    <SafeAreaView style={{ backgroundColor: '#000', flexShrink: 0 }}>
      <View
        style={[
          styles.container,
          mu.height ? { height: mu.height } : {},
          { flexDirection: 'row', alignItems: 'center', position: 'relative' },
        ]}>
        {/* 返回按钮，绝对定位在左侧 */}
        {navigation.canGoBack() && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>{'‹'}</Text>
          </TouchableOpacity>
        )}
        <View style={{ width: width, height: 1, flexShrink: 0 }} />
        {/* 标题始终居中 */}
        <View style={styles.titleWrap} pointerEvents="none">
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
        </View>
        <View style={{ width: width, height: 1, flexShrink: 0 }} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4, // Android 阴影
    shadowColor: '#000', // iOS 阴影
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    paddingVertical: 10,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    minWidth: 44,
  },
  titleWrap: {
    flexShrink: 0,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 44,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});

export default Header;
