// 样式常量
import { StyleSheet, Platform } from 'react-native';

export const AppColors = {
  primary: '#3498db',
  black333: '#333333',
  lightBackground: '#ffffff',
  darkBackground: '#121212',
};

export const AppStyle = StyleSheet.create({
  // 间距
  gap4: { gap: 4 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  gap24: { gap: 24 },
  gap32: { gap: 32 },
  gap48: { gap: 48 },
  
  // 水平间距
  paddingH4: { paddingHorizontal: 4 },
  paddingH8: { paddingHorizontal: 8 },
  paddingH12: { paddingHorizontal: 12 },
  paddingH16: { paddingHorizontal: 16 },
  paddingH20: { paddingHorizontal: 20 },
  paddingH24: { paddingHorizontal: 24 },
  
  // 垂直间距
  paddingV4: { paddingVertical: 4 },
  paddingV8: { paddingVertical: 8 },
  paddingV12: { paddingVertical: 12 },
  paddingV24: { paddingVertical: 24 },
  
  // 全方向间距
  padding4: { padding: 4 },
  padding8: { padding: 8 },
  padding12: { padding: 12 },
  padding16: { padding: 16 },
  padding20: { padding: 20 },
  padding24: { padding: 24 },
  
  // 圆角
  radius4: { borderRadius: 4 },
  radius8: { borderRadius: 8 },
  radius12: { borderRadius: 12 },
  radius24: { borderRadius: 24 },
  radius32: { borderRadius: 32 },
  radius48: { borderRadius: 48 },
});

// 字体
export const fontFamily = Platform.OS === 'windows' ? 'Microsoft YaHei' : undefined;

