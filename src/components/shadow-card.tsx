// 阴影卡片组件
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

interface ShadowCardProps {
  children: React.ReactNode;
  radius?: number;
  onTap?: () => void;
  style?: ViewStyle;
}

const ShadowCard: React.FC<ShadowCardProps> = ({
  children,
  radius = 8,
  onTap,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={onTap ? 0.7 : 1}
      onPress={onTap}
      style={[
        styles.card,
        {
          borderRadius: radius,
          shadowRadius: 4,
          shadowOpacity: 0.1,
        },
        style,
      ]}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

export default ShadowCard;

