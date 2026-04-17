// 关注用户项组件
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { FollowUser } from '../models/FollowUser';
import { Sites } from '../app/sites';
import NetImage from './net-image';

interface FollowUserItemProps {
  item: FollowUser;
  onRemove?: () => void;
  onTap?: () => void;
  onLongPress?: () => void;
  playing?: boolean;
}

const FollowUserItem: React.FC<FollowUserItemProps> = ({
  item,
  onRemove,
  onTap,
  onLongPress,
  playing = false,
}) => {
  const site = Sites.allSites[item.siteId];
  
  const getStatus = (status?: number): string => {
    if (status === 0) return '读取中';
    if (status === 1) return '未开播';
    return '直播中';
  };

  const formatLiveDuration = (startTime?: string): string => {
    if (!startTime || startTime === '0') {
      return '';
    }
    try {
      const startTimeStamp = parseInt(startTime);
      const currentTimeStamp = Math.floor(Date.now() / 1000);
      const durationInSeconds = currentTimeStamp - startTimeStamp;

      const hours = Math.floor(durationInSeconds / 3600);
      const minutes = Math.floor((durationInSeconds % 3600) / 60);

      const hourText = hours > 0 ? `${hours}小时` : '';
      const minuteText = minutes > 0 ? `${minutes}分钟` : '';

      if (hours === 0 && minutes === 0) {
        return '不足1分钟';
      }

      return `${hourText}${minuteText}`;
    } catch (error) {
      console.error('格式化开播时长出错:', error);
      return '--小时--分钟';
    }
  };

  const status = item.liveStatus || 0;
  const statusText = getStatus(status);
  const showStatus = status !== 0;
  const isLive = status === 2;

  return (
    <TouchableOpacity
      style={[styles.container, isLive && styles.containerLive]}
      onPress={onTap}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <NetImage
          picUrl={item.face}
          width={56}
          height={56}
          borderRadius={28}
        />
        {isLive && <View style={styles.liveBadge} />}
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.userName}
          </Text>
          {showStatus && (
            <View
              style={[
                styles.statusBadge,
                isLive && styles.statusBadgeLive,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isLive ? '#4CAF50' : '#999' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  isLive && styles.statusTextLive,
                ]}
              >
                {statusText}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.subtitleRow}>
          {site && (
            <View style={styles.siteInfo}>
              <Image source={site.logo} style={styles.siteLogo} />
              <Text style={styles.siteName} numberOfLines={1}>
                {site.name}
              </Text>
            </View>
          )}
          {playing ? (
            <View style={styles.playingBadge}>
              <Icon name="play" size={12} color="#3498db" />
              <Text style={styles.playingText}>正在观看</Text>
            </View>
          ) : isLive && item.liveStartTime ? (
            <View style={styles.liveTimeBadge}>
              <Icon name="radio" size={12} color="#4CAF50" />
              <Text style={styles.liveTimeText}>
                {formatLiveDuration(item.liveStartTime)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {playing ? (
        <View style={styles.trailing}>
          <View style={styles.playingIndicator}>
            <Icon name="play-circle" size={24} color="#3498db" />
          </View>
        </View>
      ) : onRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          style={styles.removeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.removeButtonInner}>
            <Icon name="x" size={16} color="#999" />
          </View>
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  containerLive: {
    backgroundColor: '#f9fff9',
  },
  avatarContainer: {
    position: 'relative',
  },
  liveBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    maxWidth: '60%',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  statusBadgeLive: {
    backgroundColor: '#e8f5e9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusTextLive: {
    color: '#4CAF50',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  siteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  siteLogo: {
    width: 16,
    height: 16,
    marginRight: 4,
    borderRadius: 2,
  },
  siteName: {
    fontSize: 12,
    color: '#999',
  },
  playingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
    gap: 4,
  },
  playingText: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '500',
  },
  liveTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e8f5e9',
    gap: 4,
  },
  liveTimeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  trailing: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FollowUserItem;
