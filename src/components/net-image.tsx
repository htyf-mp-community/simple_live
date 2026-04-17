// 网络图片组件
import React, { useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, ImageStyle } from 'react-native';
import FastImage from '@d11/react-native-fast-image';

interface NetImageProps {
  picUrl: string;
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'stretch' | 'center';
  borderRadius?: number;
  style?: ImageStyle;
}

const NetImage: React.FC<NetImageProps> = ({
  picUrl,
  width,
  height,
  fit = 'cover',
  borderRadius = 0,
  style,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!picUrl || picUrl === '') {
    return (
      <View style={[styles.placeholder, { width, height, borderRadius }]}>
        {/* 可以显示默认图片 */}
      </View>
    );
  }

  let imageUrl = picUrl;
  if (imageUrl.startsWith('//')) {
    imageUrl = `https:${imageUrl}`;
  }

  const resizeMode = fit === 'cover' 
    ? FastImage.resizeMode.cover 
    : fit === 'contain'
    ? FastImage.resizeMode.contain
    : FastImage.resizeMode.stretch;

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <FastImage
        source={{
          uri: imageUrl,
          priority: FastImage.priority.normal,
        }}
        style={[styles.image, { borderRadius }]}
        resizeMode={resizeMode}
        onLoadStart={() => {
          setLoading(true);
          setError(false);
        }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
      {loading && (
        <View style={[styles.overlay, { borderRadius }]}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}
      {error && (
        <View style={[styles.overlay, { borderRadius }]}>
          {/* 可以显示错误图标 */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NetImage;

