// 直播间卡片组件
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Utils } from '../utils';
import { LiveRoomItem } from '../pages/home/core/model/liveRoomItem';
import { Site } from '../app/sites';

interface LiveRoomCardProps {
  site: Site;
  item: LiveRoomItem;
  onPress?: () => void;
}

const LiveRoomCard: React.FC<LiveRoomCardProps> = ({ site, item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.cover }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.gradient} >
          <View style={styles.onlineContainer}>
            <Icon name="zap" size={14} color="#fff" />
            <Text style={styles.onlineText}>
              {Utils.onlineToString(item.online)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
          {item.userName}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 110,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  onlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  onlineText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  content: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  userName: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16.8,
  },
});

export default LiveRoomCard;

