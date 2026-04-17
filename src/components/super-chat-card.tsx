// SuperChat 卡片组件
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LiveSuperChatMessage } from '../pages/home/core/interface/liveSuperChatMessage';
import { Utils } from '../utils';
import NetImage from './net-image';

interface SuperChatCardProps {
  message: LiveSuperChatMessage;
  onExpire?: () => void;
  customCountdown?: number;
}

const SuperChatCard: React.FC<SuperChatCardProps> = ({
  message,
  onExpire,
  customCountdown,
}) => {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = Math.floor(message.endTime.getTime() / 1000);
    const initialCountdown = endTime - currentTime;

    setCountdown(initialCountdown > 0 ? initialCountdown : 0);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [message.endTime, onExpire]);

  const displayCountdown = customCountdown !== undefined ? customCountdown : countdown;
  const backgroundColor = Utils.convertHexColor(message.backgroundColor);
  const backgroundBottomColor = Utils.convertHexColor(message.backgroundBottomColor);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <NetImage
          source={{ uri: message.face }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{message.userName}</Text>
          <Text style={styles.price}>￥{message.price}</Text>
        </View>
        <Text style={styles.countdown}>{displayCountdown}</Text>
      </View>
      <View style={[styles.messageContainer, { backgroundColor: backgroundBottomColor }]}>
        <Text style={styles.message}>{message.message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  price: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  countdown: {
    fontSize: 14,
    color: '#666',
  },
  messageContainer: {
    padding: 8,
  },
  message: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
});

export default SuperChatCard;

