// 公共页面 Header 组件 - 自动处理胶囊按钮布局
import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useHeaderLayout } from '../utils/header';
import Icon from 'react-native-vector-icons/Feather';

export interface PageHeaderProps {
  /** 标题文本 */
  title: string;
  /** 是否显示返回按钮（默认根据 navigation.canGoBack() 判断） */
  showBack?: boolean;
  /** 右侧操作区域 */
  rightContent?: ReactNode;
  /** 自定义样式 */
  style?: ViewStyle;
  /** 标题样式 */
  titleStyle?: ViewStyle;
  /** 背景色 */
  backgroundColor?: string;
  /** 文字颜色 */
  textColor?: string;
  /** 返回按钮点击事件（默认 navigation.goBack()） */
  onBackPress?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  showBack,
  rightContent,
  style,
  titleStyle,
  backgroundColor = '#fff',
  textColor = '#333',
  onBackPress,
}) => {
  const navigation = useNavigation();
  const headerLayout = useHeaderLayout();

  const canGoBack = navigation.canGoBack();
  const shouldShowBack = showBack !== undefined ? showBack : canGoBack;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (canGoBack) {
      navigation.goBack();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: headerLayout.paddingTop,
          backgroundColor,
        },
        style,
      ]}
    >
      <View style={[styles.content, { paddingRight: Math.max(headerLayout.paddingRight, 16) }]}>
        {/* 左侧：返回按钮 */}
        {shouldShowBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-left" size={24} color={textColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        {/* 中间：标题 */}
        <View style={[styles.titleContainer, titleStyle]}>
          <Text
            style={[styles.title, { color: textColor }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* 右侧：自定义内容或占位 */}
        {rightContent ? (
          <View style={styles.rightContent}>{rightContent}</View>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 44,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  backButtonPlaceholder: {
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default PageHeader;

