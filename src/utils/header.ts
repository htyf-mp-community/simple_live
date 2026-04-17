// Header 工具函数 - 处理胶囊按钮布局
import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import jssdk from '@htyf-mp/js-sdk';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface HeaderLayout {
  paddingTop: number;
  paddingRight: number;
  height: number;
  rightOffset: number; // 右侧偏移量，用于避免被胶囊按钮遮挡
}

/**
 * 获取 Header 布局信息，考虑胶囊按钮位置
 * @returns Header 布局信息
 */
export function useHeaderLayout(): HeaderLayout {
  const insets = useSafeAreaInsets();
  const menuButton = useMemo(() => {
    return jssdk.getMenuButtonBoundingClientRect();
  }, []);

  return useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    // 计算右侧需要留出的空间，避免被胶囊按钮遮挡
    // menuButton.left 是胶囊按钮左边距屏幕左边的距离
    // screenWidth - menuButton.left 是从胶囊按钮左边到屏幕右边的距离
    let rightOffset = 0;
    
    // 只有当胶囊按钮信息有效时才计算
    if (menuButton && menuButton.left > 0 && menuButton.left < screenWidth) {
      rightOffset = screenWidth - menuButton.left;
      // 限制最大偏移量，避免过度压缩内容（最多留出 120px）
      rightOffset = Math.min(rightOffset, 120);
    }

    return {
      paddingTop: Math.max(menuButton.top || 0, insets.top),
      paddingRight: rightOffset > 0 ? rightOffset + 8 : 0, // 额外加 8px 间距
      height: menuButton.height || 44,
      rightOffset: rightOffset > 0 ? rightOffset : 0,
    };
  }, [menuButton, insets.top]);
}

/**
 * 获取胶囊按钮信息（非 Hook 版本）
 * @returns 胶囊按钮布局信息
 */
export function getMenuButtonLayout() {
  return jssdk.getMenuButtonBoundingClientRect();
}

