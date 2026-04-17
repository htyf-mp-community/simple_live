// 筛选按钮组件
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface FilterButtonProps {
  selected: boolean;
  text: string;
  onTap?: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  selected = false,
  text,
  onTap,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, selected && styles.buttonSelected]}
      onPress={onTap}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  buttonSelected: {
    borderColor: '#3498db',
    backgroundColor: '#e3f2fd',
  },
  text: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  textSelected: {
    color: '#3498db',
    fontWeight: '600',
  },
});

export default FilterButton;
