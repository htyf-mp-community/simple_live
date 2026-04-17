import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  Dimensions,
  Modal,
  StatusBar,
  BackHandler,
  ScrollView,
  FlatList,
  Image,
  RefreshControl,
  Switch,
} from 'react-native';
import { VLCPlayer } from 'react-native-vlc-media-player';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Orientation from 'react-native-orientation-locker';
import Icon from 'react-native-vector-icons/Feather';
import { useHeaderLayout } from '../../utils/header';
import PageHeader from '../../components/PageHeader';
import { BilibiliSite, DouyinSite, DouyuSite, HuyaSite } from './core/api';
import { Sites } from '../../app/sites';
import { DBService } from '../../services/DBService';
import { FollowService } from '../../services/FollowService';
import { LocalStorageService } from '../../services/LocalStorageService';
import { History } from '../../models/History';
import { FollowUser } from '../../models/FollowUser';
import { LiveRoomDetail } from './core/model/liveRoomDetail';
import { LiveMessage } from './core/model/liveMessage';
import { LiveSuperChatMessage } from './core/interface/liveSuperChatMessage';
import { Constants } from '../../app/constants';
import { Utils } from '../../utils';
import NetImage from '../../components/net-image';
import FollowUserItem from '../../components/follow-user-item';
import SuperChatCard from '../../components/super-chat-card';

const platforms = [
  { key: 'bilibili', site: new BilibiliSite() },
  { key: 'douyin', site: new DouyinSite() },
  { key: 'douyu', site: new DouyuSite() },
  { key: 'huya', site: new HuyaSite() },
];

export default function RoomPlayer({ route }: any) {
  const isFocus = useIsFocused();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerLayout = useHeaderLayout();
  const { site_id, roomId } = route.params;
  const [playUrl, setPlayUrl] = useState('');
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [qualities, setQualities] = useState<any[]>([]);
  const [currentQuality, setCurrentQuality] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [detail, setDetail] = useState<LiveRoomDetail | null>(null);
  const [followed, setFollowed] = useState(false);
  const [online, setOnline] = useState(0);
  const [liveStatus, setLiveStatus] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'sc' | 'follow' | 'settings'>('chat');
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [superChats, setSuperChats] = useState<LiveSuperChatMessage[]>([]);
  const [disableAutoScroll, setDisableAutoScroll] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [chatTextSize, setChatTextSize] = useState(14);
  const [chatTextGap, setChatTextGap] = useState(4);
  const [chatBubbleStyle, setChatBubbleStyle] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const messageListRef = useRef<FlatList>(null);

  const site = Sites.allSites[site_id];
  const siteObj = site?.liveSite;
  const db = DBService.getInstance();
  const screenDimensions = Dimensions.get('window');
  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;
  const videoHeight = isFullScreen ? screenHeight : (screenWidth * 9) / 16; // 16:9 比例 + 100

  const header = useMemo(() => {
    return [];
    return Object.entries(headers || {})?.map(
      ([key, value]) => `--http-${key}=${value}`
    );
  }, [headers]);

  // 添加历史记录
  const addHistory = useCallback(
    async (roomDetail: LiveRoomDetail) => {
      if (!site || !roomDetail) return;
      const id = `${site.id}_${roomId}`;
      const history: History = {
        id,
        roomId,
        siteId: site.id,
        userName: roomDetail.userName,
        face: roomDetail.userAvatar || '',
        updateTime: new Date().toISOString(),
      };
      await db.addOrUpdateHistory(history);
    },
    [site, roomId, db]
  );

  // 拉流逻辑
  const fetchPlayUrl = async (detail: any, quality: any) => {
    if (!siteObj) return;
    setError('');
    try {
      const res = await siteObj.getPlayUrls(detail, quality);
      if (res && res.urls && res.urls.length > 0) {
        setPlayUrl(res.urls[2] || res.urls[0]);
        // 只有非斗鱼平台才可能有 headers
        if (site_id === 'huya' && (res as any).headers) {
          setHeaders((res as any).headers);
        }
        console.log('播放地址获取成功', res.urls);
        // 播放地址获取成功后，等待播放器开始播放，由播放器事件控制 loading
      } else {
        setError('未获取到播放地址');
        setLoading(false);
      }
    } catch (e: any) {
      setError(e?.message || '获取播放地址失败');
    setLoading(false);
    }
  };

  // 检查是否已关注
  useEffect(() => {
    if (site && roomId) {
      const checkFollowed = async () => {
        const follow = await db.getFollow(`${site.id}_${roomId}`);
        setFollowed(!!follow);
      };
      checkFollowed();
    }
  }, [site, roomId, db]);

  // 初始化
  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: ReturnType<typeof setTimeout> | null = null;
    
    async function fetchAll() {
      setLoading(true);
      setError('');
      try {
        if (!siteObj || !roomId) return;
        const roomDetail = await siteObj.getRoomDetail(roomId);
        if (!roomDetail) {
          throw new Error('获取房间详情失败');
        }

        if (isMounted) {
          setDetail(roomDetail);
          setOnline(roomDetail.online);
          setLiveStatus(roomDetail.status);

          // 添加历史记录
          await addHistory(roomDetail);

          // 获取清晰度
          const qs = await siteObj.getPlayQualities(roomDetail);
          if (!qs || qs.length === 0) throw new Error('无可用清晰度');

          setQualities(qs);
          setCurrentQuality(qs[0]);
          await fetchPlayUrl(roomDetail, qs[0]);
          
          // 播放地址获取后，设置一个超时，如果播放器没有开始播放，则隐藏 loading
          // 避免 loading 一直显示
          loadingTimeout = setTimeout(() => {
            if (isMounted) {
              setLoading(false);
            }
          }, 10000); // 10秒后自动隐藏 loading
        }
      } catch (e: any) {
        if (isMounted) {
        setError(e?.message || '获取播放地址失败');
        setLoading(false);
      }
    }
    }
    
    fetchAll();
    
    return () => {
      isMounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [roomId, siteObj, addHistory]);

  // 关注用户
  const handleFollow = async () => {
    if (!site || !detail) return;
    const id = `${site.id}_${roomId}`;
    const follow: FollowUser = {
      id,
      roomId,
      siteId: site.id,
      userName: detail.userName,
      face: detail.userAvatar || '',
      addTime: new Date().toISOString(),
      tag: '全部',
    };
    await db.addFollow(follow);
    setFollowed(true);
    FollowService.getInstance().loadData(false);
  };

  // 取消关注
  const handleUnfollow = async () => {
    if (!site) return;
    const result = await Utils.showAlertDialog(
      '确定要取消关注该用户吗？',
      { title: '取消关注' }
    );
    if (!result) return;

    const id = `${site.id}_${roomId}`;
    await db.deleteFollow(id);
    setFollowed(false);
    FollowService.getInstance().loadData(false);
  };

  // 分享
  const handleShare = async () => {
    if (!detail) return;
    try {
      await Share.share({
        message: detail.url,
        url: detail.url,
        title: detail.title,
      });
    } catch (error) {
      console.error('分享失败:', error);
    }
  };

  // 复制链接
  const handleCopyUrl = async () => {
    if (!detail) return;
    await Utils.copyToClipboard(detail.url);
    Alert.alert('提示', '已复制直播间链接');
  };

  // 复制播放直链
  const handleCopyPlayUrl = async () => {
    if (!playUrl) return;
    await Utils.copyToClipboard(playUrl);
    Alert.alert('提示', '已复制播放直链');
  };

  // 刷新房间
  const handleRefresh = async () => {
    if (!siteObj || !roomId) return;
    setLoading(true);
    setError('');
    
    // 清除旧消息
    setMessages([]);
    setSuperChats([]);
    
    // 断开旧弹幕连接
    if (danmakuInstance) {
      try {
        await danmakuInstance.disconnect();
      } catch (e) {
        console.error('断开弹幕失败:', e);
      }
      setDanmakuInstance(null);
      setIsDanmakuConnected(false);
    }
    
    try {
      const roomDetail = await siteObj.getRoomDetail(roomId);
      if (roomDetail) {
        setDetail(roomDetail);
        setOnline(roomDetail.online);
        setLiveStatus(roomDetail.status);
        if (currentQuality) {
          fetchPlayUrl(roomDetail, currentQuality);
        }
        // 弹幕连接会在 useEffect 中自动重新建立
      }
    } catch (e: any) {
      setError(e?.message || '刷新失败');
      setLoading(false);
    }
  };

  // 切换清晰度
  const onQualityChange = async (q: any) => {
    if (!siteObj || !detail) return;
    setCurrentQuality(q);
    setLoading(true);
    setError('');
    try {
      fetchPlayUrl(detail, q);
    } catch (e: any) {
      setError(e?.message || '切换清晰度失败');
      setLoading(false);
    }
  };

  // 格式化在线人数
  const formatOnline = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toString();
  };

  // 渲染消息项
  const renderMessageItem = (item: LiveMessage) => {
    if (item.type === 'system' || item.userName === 'LiveSysMessage') {
      return (
        <View style={[styles.systemMessage, { marginVertical: chatTextGap / 2 }]}>
          <Text style={[styles.systemMessageText, { fontSize: chatTextSize }]}>
            {item.content}
          </Text>
        </View>
      );
    }

    if (chatBubbleStyle) {
      // 气泡样式
      return (
        <View style={[styles.messageItem, { marginVertical: chatTextGap / 2 }]}>
          <View style={styles.messageBubble}>
            <Text style={[styles.messageText, { fontSize: chatTextSize }]}>
              <Text style={styles.messageUserName}>{item.userName}：</Text>
              <Text>{item.content}</Text>
            </Text>
          </View>
        </View>
      );
    }

    // 普通样式
    return (
      <View style={[styles.messageItem, { marginVertical: chatTextGap / 2 }]}>
        <Text style={[styles.messageText, { fontSize: chatTextSize }]}>
          <Text style={styles.messageUserName}>{item.userName}：</Text>
          <Text>{item.content}</Text>
        </Text>
      </View>
    );
  };

  // 添加系统消息
  const addSysMsg = useCallback((msg: string) => {
    setMessages((prev) => [
      ...prev,
      {
        type: 'system',
        content: msg,
        userName: 'LiveSysMessage',
      } as LiveMessage,
    ]);
  }, []);

  // 加载 SC 消息
  const loadSuperChats = useCallback(async () => {
    if (!siteObj || !detail || site_id !== Constants.kBiliBili) return;
    try {
      const scs = await siteObj.getSuperChatMessage(detail.roomId);
      setSuperChats(scs);
    } catch (e) {
      console.error('Load super chat error:', e);
      addSysMsg('SC读取失败');
    }
  }, [siteObj, detail, site_id, addSysMsg]);

  // 弹幕连接管理
  const [danmakuInstance, setDanmakuInstance] = useState<any>(null);
  const [isDanmakuConnected, setIsDanmakuConnected] = useState(false);

  // 关键词屏蔽检查
  const checkShieldKeyword = useCallback(async (message: string): Promise<boolean> => {
    const storage = LocalStorageService.getInstance();
    const shieldList = await storage.getShieldList();
    
    for (const keyword of shieldList) {
      // 检查是否是正则表达式（以 / 开头和结尾）
      if (keyword.startsWith('/') && keyword.endsWith('/')) {
        const regexPattern = keyword.slice(1, -1);
        try {
          const regex = new RegExp(regexPattern);
          if (regex.test(message)) {
            return true; // 被屏蔽
          }
        } catch (e) {
          console.warn(`关键词正则格式错误: ${keyword}`);
          continue;
        }
      } else {
        // 普通关键词匹配
        if (message.includes(keyword)) {
          return true; // 被屏蔽
        }
      }
    }
    
    return false; // 未被屏蔽
  }, []);

  // 处理弹幕消息
  const handleDanmakuMessage = useCallback(async (msg: any) => {
    // 根据消息类型处理
    if (msg.type === 'chat' || msg.type === 'danmaku') {
      const messageText = msg.content || msg.message || '';
      
      // 关键词屏蔽检查
      const isShielded = await checkShieldKeyword(messageText);
      if (isShielded) {
        return; // 被屏蔽，不显示
      }
      
      // 限制消息数量
      setMessages((prev) => {
        const newMessages = [...prev, msg];
        // 如果消息太多且用户没有手动滚动，则删除旧消息
        if (newMessages.length > 200) {
          return newMessages.slice(-200);
        }
        return newMessages;
      });

      // 自动滚动到底部（如果用户没有手动滚动）
      setDisableAutoScroll((current) => {
        if (!current) {
          setTimeout(() => {
            messageListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
        return current;
      });
    } else if (msg.type === 'online') {
      // 更新在线人数
      if (typeof msg.data === 'number') {
        setOnline(msg.data);
      }
    } else if (msg.type === 'superChat' || msg.type === 'sc') {
      // 添加 SC 消息
      setSuperChats((prev) => [...prev, msg.data]);
    } else if (msg.type === 'ready') {
      // 弹幕服务器准备就绪
      addSysMsg('弹幕服务器连接正常');
    } else if (msg.type === 'close') {
      // 连接关闭
      addSysMsg(msg.message || '弹幕服务器连接关闭');
    }
  }, [checkShieldKeyword, addSysMsg]);

  // 初始化弹幕连接
  useEffect(() => {
    if (!detail || !liveStatus || !siteObj) return;

    let danmaku: any = null;
    
    // 根据平台创建弹幕实例
    if (site_id === Constants.kBiliBili && detail.danmakuData) {
      const { BilibiliDanmaku } = require('./core/danmaku/bilibiliDanmaku');
      danmaku = new BilibiliDanmaku();
    } else if (site_id === Constants.kDouyu && detail.danmakuData) {
      const { DouyuDanmaku } = require('./core/danmaku/douyuDanmaku');
      danmaku = new DouyuDanmaku();
      // 斗鱼的 danmakuData 就是 roomId 字符串
    } else if (site_id === Constants.kHuya && detail.danmakuData) {
      const { HuyaDanmaku } = require('./core/danmaku/huyaDanmaku');
      danmaku = new HuyaDanmaku();
    } else if (site_id === Constants.kDouyin && detail.danmakuData) {
      const { DouyinDanmaku } = require('./core/danmaku/douyinDanmaku');
      danmaku = new DouyinDanmaku();
      // 设置签名函数（从 siteObj 获取）
      if (siteObj && typeof siteObj.getSignature === 'function') {
        danmaku.setSignatureFunction((roomId: string, uniqueId: string) => {
          return siteObj.getSignature(roomId, uniqueId);
        });
      }
    }

    if (danmaku) {
      setDanmakuInstance(danmaku);
      addSysMsg('正在连接弹幕服务器');
      
      // 设置消息回调
      danmaku.onMessage((msg: any) => {
        handleDanmakuMessage(msg);
      });

      // 连接弹幕服务器
      danmaku.connect(detail.danmakuData)
        .then(() => {
          setIsDanmakuConnected(true);
          addSysMsg('弹幕服务器连接正常');
        })
        .catch((error: any) => {
          console.error('弹幕连接失败:', error);
          addSysMsg('弹幕服务器连接失败');
        });
    }

    return () => {
      // 清理弹幕连接
      if (danmaku) {
        danmaku.disconnect().catch((e: any) => console.error('断开弹幕失败:', e));
      }
      setDanmakuInstance(null);
      setIsDanmakuConnected(false);
    };
  }, [detail, liveStatus, site_id, siteObj, addSysMsg, handleDanmakuMessage]);

  // 加载 SC
  useEffect(() => {
    if (detail && site_id === Constants.kBiliBili) {
      loadSuperChats();
    }
  }, [detail, site_id, loadSuperChats]);

  // 加载聊天设置
  useEffect(() => {
    const loadChatSettings = async () => {
      const storage = LocalStorageService.getInstance();
      const textSize = await storage.getValue(LocalStorageService.kChatTextSize, 14);
      const textGap = await storage.getValue(LocalStorageService.kChatTextGap, 4);
      const bubbleStyle = await storage.getValue(LocalStorageService.kChatBubbleStyle, false);
      setChatTextSize(typeof textSize === 'number' ? textSize : 14);
      setChatTextGap(typeof textGap === 'number' ? textGap : 4);
      setChatBubbleStyle(typeof bubbleStyle === 'boolean' ? bubbleStyle : false);
    };
    loadChatSettings();
  }, []);

  // 进入全屏
  const enterFullScreen = useCallback(() => {
    setIsFullScreen(true);
    setShowControls(true);
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Orientation.lockToLandscape();
      StatusBar.setHidden(true, 'fade');
    }
  }, []);

  // 退出全屏
  const exitFullScreen = useCallback(() => {
    setIsFullScreen(false);
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Orientation.lockToPortrait();
      StatusBar.setHidden(false, 'fade');
    }
  }, []);

  // 监听返回键（Android）
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backAction = () => {
        if (isFullScreen) {
          exitFullScreen();
          return true;
        }
        return false;
      };
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );
      return () => backHandler.remove();
    }
  }, [isFullScreen, exitFullScreen]);

  // 组件卸载时恢复状态
  useEffect(() => {
    return () => {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        Orientation.lockToPortrait();
        StatusBar.setHidden(false, 'fade');
      }
    };
  }, []);

  if (error && !detail) {
    return (
      <View style={styles.errorContainer}>
        <PageHeader title="直播间加载失败" />
        <View style={styles.errorContent}>
          <Icon name="alert-circle" size={64} color="#ddd" />
          <Text style={styles.errorTitle}>直播间加载失败</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorInfo}>
            {site_id} - {roomId}
          </Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.errorButton}
              onPress={() => {
                Utils.copyToClipboard(`${site_id} - ${roomId}\n${error}`);
                Alert.alert('提示', '已复制错误信息');
              }}
            >
              <Icon name="copy" size={16} color="#666" />
              <Text style={styles.errorButtonText}>复制信息</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.errorButton, styles.errorButtonPrimary]}
              onPress={handleRefresh}
            >
              <Icon name="refresh-cw" size={16} color="#fff" />
              <Text
                style={[
                  styles.errorButtonText,
                  styles.errorButtonTextPrimary,
                ]}
              >
                刷新
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 全屏模式
  if (isFullScreen) {
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar hidden={true} />
        {playUrl && isFocus ? (
          <VLCPlayer
            source={{
              uri: playUrl,
              initOptions: [
                '--no-drop-late-frames',
                '--no-skip-frames',
                '--rtsp-tcp',
                '--network-caching=2000',
                '--verbose=2',
                '--codec=264',
              ].concat(header),
            }}
            style={styles.fullScreenVideo}
            paused={false}
            autoAspectRatio={true}
            autoplay
            onBuffering={(e: any) => {
              // 只在真正缓冲时显示 loading
              if (e?.isBuffering) {
                setLoading(true);
              } else {
                setLoading(false);
              }
            }}
            onPlaying={(e: any) => {
              setLoading(false);
            }}
            onEnd={(e: any) => {
              setLoading(false);
            }}
            onError={(error: any) => {
              console.error('播放失败 error', error);
              setError('播放失败');
              setLoading(false);
            }}
            onStopped={(e: any) => {
              setLoading(false);
            }}
          />
        ) : null}

        {/* 未开播提示 */}
        {!liveStatus && (
          <View style={styles.notLiveOverlay}>
            <Text style={styles.notLiveText}>未开播</Text>
          </View>
        )}

        {/* 全屏控制栏 */}
        {showControls && (
          <View style={styles.fullScreenControls}>
            <View style={[styles.fullScreenHeader, { paddingRight: Math.max(headerLayout.paddingRight, 16) }]}>
              <TouchableOpacity
                style={styles.fullScreenButton}
                onPress={exitFullScreen}
              >
                <Icon name="x" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.fullScreenHeaderInfo}>
                <Text style={styles.fullScreenTitle} numberOfLines={1}>
                  {detail?.title || '直播间'}
                </Text>
              </View>
              <View style={styles.fullScreenHeaderActions}>
                <TouchableOpacity
                  style={styles.fullScreenActionButton}
                  onPress={() => setShowQualityModal(true)}
                >
                  <Text style={styles.fullScreenActionText}>
                    {currentQuality?.name || currentQuality?.quality || '清晰度'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* 点击显示/隐藏控制栏 */}
        <TouchableOpacity
          style={styles.fullScreenTapArea}
          activeOpacity={1}
          onPress={() => setShowControls(!showControls)}
        />

        {/* 加载状态 */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* 清晰度选择弹窗（全屏模式） */}
        <Modal
          visible={showQualityModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowQualityModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>选择清晰度</Text>
                <TouchableOpacity onPress={() => setShowQualityModal(false)}>
                  <Icon name="x" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.qualityList}>
                {qualities.map((quality, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.qualityItem,
                      currentQuality === quality && styles.qualityItemActive,
                    ]}
                    onPress={() => {
                      onQualityChange(quality);
                      setShowQualityModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.qualityItemText,
                        currentQuality === quality &&
                          styles.qualityItemTextActive,
                      ]}
                    >
                      {quality.name || quality.quality || `清晰度${index + 1}`}
                    </Text>
                    {currentQuality === quality && (
                      <Icon name="check" size={20} color="#3498db" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={false} />
      {/* Header 区域 - 不再浮动 */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, headerLayout.paddingTop) }]}>
        <View style={[styles.headerContent, { paddingRight: Math.max(headerLayout.paddingRight, 12) }]}>
          <TouchableOpacity
            style={styles.backButtonWhite}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {detail?.title || '直播间'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.qualityButtonHeader}
            onPress={() => setShowQualityModal(true)}
          >
            <Text style={styles.qualityButtonText}>
              {currentQuality?.name || currentQuality?.quality || '清晰度'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fullScreenButtonHeader}
            onPress={enterFullScreen}
          >
            <Icon name="maximize" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.moreButtonHeader}
            onPress={() => setShowMoreModal(true)}
          >
            <Icon name="more-horizontal" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* 视频播放器区域 */}
      <View style={[styles.videoContainer, { height: videoHeight }]}>
      {playUrl && isFocus ? (
        <VLCPlayer
          source={{
            uri: playUrl,
            initOptions: [
              '--no-drop-late-frames',
              '--no-skip-frames',
              '--rtsp-tcp',
              '--network-caching=2000',
              '--verbose=2',
              '--codec=264',
            ].concat(header),
          }}
          style={styles.video}
          paused={false}
          autoAspectRatio={true}
          autoplay
            onBuffering={(e: any) => {
              // 只在真正缓冲时显示 loading
              if (e?.isBuffering) {
                setLoading(true);
              } else {
                setLoading(false);
              }
          }}
            onPlaying={(e: any) => {
              setLoading(false);
            }}
            onEnd={(e: any) => {
              setLoading(false);
            }}
            onError={(error: any) => {
            console.error('播放失败 error', error);
              setError('播放失败');
              setLoading(false);
            }}
            onStopped={(e: any) => {
              setLoading(false);
          }}
        />
      ) : null}

        {/* 未开播提示 */}
        {!liveStatus && (
          <View style={styles.notLiveOverlay}>
            <Text style={styles.notLiveText}>未开播</Text>
          </View>
        )}

        {/* 点击显示/隐藏控制栏 */}
        <TouchableOpacity
          style={styles.tapArea}
          activeOpacity={1}
          onPress={() => setShowControls(!showControls)}
        />

        {/* 加载状态 */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>

      {/* 用户资料区域 */}
      {detail && (
        <View style={styles.userProfile}>
          <View style={styles.avatarContainer}>
            <NetImage
              picUrl={detail.userAvatar || ''}
              width={48}
              height={48}
              borderRadius={24}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {detail.userName}
            </Text>
            <View style={styles.userMeta}>
              {site?.logo && (
                <Image source={site.logo} style={styles.siteLogo} />
              )}
              <Text style={styles.siteName}>{site?.name || ''}</Text>
              <View style={styles.onlineContainer}>
                <Icon name="zap" size={14} color="#ff9800" />
            <Text style={styles.onlineText}>
                  {formatOnline(online)}
            </Text>
          </View>
            </View>
          </View>
        </View>
      )}

      {/* Tab 切换区域 */}
      <View style={styles.tabBar}>
          <TouchableOpacity
          style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
            聊天
          </Text>
        </TouchableOpacity>
        {site_id === Constants.kBiliBili && (
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'sc' && styles.tabItemActive]}
            onPress={() => setActiveTab('sc')}
          >
            <Text style={[styles.tabText, activeTab === 'sc' && styles.tabTextActive]}>
              SC{superChats.length > 0 ? `(${superChats.length})` : ''}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'follow' && styles.tabItemActive]}
          onPress={() => setActiveTab('follow')}
        >
          <Text style={[styles.tabText, activeTab === 'follow' && styles.tabTextActive]}>
            关注
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
            设置
            </Text>
          </TouchableOpacity>
        </View>

      {/* Tab 内容区域 */}
      <View style={styles.tabContent}>
        {activeTab === 'chat' && (
          <View style={styles.chatContainer}>
            <FlatList
              ref={messageListRef}
              data={messages}
              keyExtractor={(item, index) => `${item.type}-${index}`}
              renderItem={({ item }) => renderMessageItem(item)}
              contentContainerStyle={styles.chatList}
              onScrollBeginDrag={() => setDisableAutoScroll(true)}
              onContentSizeChange={() => {
                if (!disableAutoScroll) {
                  messageListRef.current?.scrollToEnd({ animated: true });
                }
              }}
            />
            {disableAutoScroll && (
              <TouchableOpacity
                style={styles.scrollToBottomButton}
                onPress={() => {
                  setDisableAutoScroll(false);
                  messageListRef.current?.scrollToEnd({ animated: true });
                }}
              >
                <Icon name="chevron-down" size={20} color="#fff" />
                <Text style={styles.scrollToBottomText}>最新</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {activeTab === 'sc' && site_id === Constants.kBiliBili && (
          <ScrollView style={styles.scContainer}>
            {superChats.map((sc, index) => (
              <SuperChatCard
                key={index}
                message={sc}
                onExpire={() => {
                  setSuperChats((prev) => prev.filter((_, i) => i !== index));
                }}
              />
            ))}
          </ScrollView>
        )}
        {activeTab === 'follow' && (
          <FlatList
            data={FollowService.getInstance().liveList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FollowUserItem
                item={item}
                playing={site_id === item.siteId && roomId === item.roomId}
                onTap={() => {
                  // @ts-ignore
                  navigation.replace('RoomPlayer', {
                    site_id: item.siteId,
                    roomId: item.roomId,
                  });
                }}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => FollowService.getInstance().loadData(false)}
              />
            }
          />
        )}
        {activeTab === 'settings' && (
          <ScrollView style={styles.settingsContainer}>
            <Text style={styles.settingsSectionTitle}>聊天区</Text>
            <View style={styles.settingsCard}>
              <View style={styles.settingsItemRow}>
                <Text style={styles.settingsItemLabel}>文字大小</Text>
                <View style={styles.settingsItemValue}>
                  <TouchableOpacity
                    style={styles.settingsNumberButton}
                    onPress={async () => {
                      if (chatTextSize > 8) {
                        const newSize = chatTextSize - 1;
                        setChatTextSize(newSize);
                        await LocalStorageService.getInstance().setValue(
                          LocalStorageService.kChatTextSize,
                          newSize
                        );
                      }
                    }}
                  >
                    <Icon name="minus" size={16} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.settingsNumberValue}>{chatTextSize}</Text>
                  <TouchableOpacity
                    style={styles.settingsNumberButton}
                    onPress={async () => {
                      if (chatTextSize < 36) {
                        const newSize = chatTextSize + 1;
                        setChatTextSize(newSize);
                        await LocalStorageService.getInstance().setValue(
                          LocalStorageService.kChatTextSize,
                          newSize
                        );
                      }
                    }}
                  >
                    <Icon name="plus" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.settingsDivider} />
              <View style={styles.settingsItemRow}>
                <Text style={styles.settingsItemLabel}>上下间隔</Text>
                <View style={styles.settingsItemValue}>
                  <TouchableOpacity
                    style={styles.settingsNumberButton}
                    onPress={async () => {
                      if (chatTextGap > 0) {
                        const newGap = chatTextGap - 1;
                        setChatTextGap(newGap);
                        await LocalStorageService.getInstance().setValue(
                          LocalStorageService.kChatTextGap,
                          newGap
                        );
                      }
                    }}
                  >
                    <Icon name="minus" size={16} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.settingsNumberValue}>{chatTextGap}</Text>
                  <TouchableOpacity
                    style={styles.settingsNumberButton}
                    onPress={async () => {
                      if (chatTextGap < 12) {
                        const newGap = chatTextGap + 1;
                        setChatTextGap(newGap);
                        await LocalStorageService.getInstance().setValue(
                          LocalStorageService.kChatTextGap,
                          newGap
                        );
                      }
                    }}
                  >
                    <Icon name="plus" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.settingsDivider} />
              <View style={styles.settingsItemRow}>
                <Text style={styles.settingsItemLabel}>气泡样式</Text>
                <Switch
                  value={chatBubbleStyle}
                  onValueChange={async (value) => {
                    setChatBubbleStyle(value);
                    await LocalStorageService.getInstance().setValue(
                      LocalStorageService.kChatBubbleStyle,
                      value
                    );
                  }}
                />
              </View>
            </View>
            <Text style={styles.settingsSectionTitle}>更多设置</Text>
            <View style={styles.settingsCard}>
              <TouchableOpacity
                style={styles.settingsAction}
                onPress={() => {
                  // @ts-ignore
                  navigation.navigate('DanmuShield');
                }}
              >
                <Text style={styles.settingsActionText}>关键词屏蔽</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <View style={styles.settingsDivider} />
              <TouchableOpacity
                style={styles.settingsAction}
                onPress={() => {
                  // @ts-ignore
                  navigation.navigate('DanmuSettings');
                }}
              >
                <Text style={styles.settingsActionText}>弹幕设置</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <View style={styles.settingsDivider} />
              <TouchableOpacity
                style={styles.settingsAction}
                onPress={() => {
                  // @ts-ignore
                  navigation.navigate('AutoExitSettings');
                }}
              >
                <Text style={styles.settingsActionText}>定时关闭</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <View style={styles.settingsDivider} />
              <TouchableOpacity
                style={styles.settingsAction}
                onPress={() => {
                  // TODO: 实现画面尺寸设置
                  Alert.alert('提示', '画面尺寸设置功能待实现');
                }}
              >
                <Text style={styles.settingsActionText}>画面尺寸</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {/* 底部操作栏 */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.bottomActionButton}
          onPress={handleRefresh}
        >
          <Icon name="refresh-cw" size={20} color="#666" />
          <Text style={styles.bottomActionText}>刷新</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomActionButton}
          onPress={followed ? handleUnfollow : handleFollow}
        >
          <Icon
            name="heart"
            size={20}
            color={followed ? '#f44336' : '#666'}
          />
          <Text
            style={[
              styles.bottomActionText,
              followed && styles.bottomActionTextActive,
            ]}
          >
            {followed ? '取消关注' : '关注'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomActionButton}
          onPress={handleShare}
        >
          <Icon name="share-2" size={20} color="#666" />
          <Text style={styles.bottomActionText}>分享</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomActionButton}
          onPress={handleCopyUrl}
        >
          <Icon name="copy" size={20} color="#666" />
          <Text style={styles.bottomActionText}>复制链接</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomActionButton}
          onPress={handleCopyPlayUrl}
        >
          <Icon name="link" size={20} color="#666" />
          <Text style={styles.bottomActionText}>播放直链</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomActionButton}
          onPress={enterFullScreen}
        >
          <Icon name="maximize" size={20} color="#666" />
          <Text style={styles.bottomActionText}>全屏</Text>
        </TouchableOpacity>
      </View>

      {/* 更多操作菜单 */}
      <Modal
        visible={showMoreModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>更多操作</Text>
              <TouchableOpacity onPress={() => setShowMoreModal(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.moreMenuList}>
              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  handleRefresh();
                }}
              >
                <Icon name="refresh-cw" size={20} color="#666" />
                <Text style={styles.moreMenuText}>刷新</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  setShowQualityModal(true);
                }}
              >
                <Icon name="monitor" size={20} color="#666" />
                <Text style={styles.moreMenuText}>切换清晰度</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  // TODO: 实现切换线路
                  Alert.alert('提示', '切换线路功能待实现');
                }}
              >
                <Icon name="layers" size={20} color="#666" />
                <Text style={styles.moreMenuText}>切换线路</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  // TODO: 实现画面尺寸设置
                  Alert.alert('提示', '画面尺寸设置功能待实现');
                }}
              >
                <Icon name="maximize-2" size={20} color="#666" />
                <Text style={styles.moreMenuText}>画面尺寸</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  // TODO: 实现截图功能
                  Alert.alert('提示', '截图功能待实现');
                }}
              >
                <Icon name="camera" size={20} color="#666" />
                <Text style={styles.moreMenuText}>截图</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  // TODO: 实现定时关闭
                  Alert.alert('提示', '定时关闭功能待实现');
                }}
              >
                <Icon name="clock" size={20} color="#666" />
                <Text style={styles.moreMenuText}>定时关闭</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  handleShare();
                }}
              >
                <Icon name="share-2" size={20} color="#666" />
                <Text style={styles.moreMenuText}>分享直播间</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  handleCopyUrl();
                }}
              >
                <Icon name="copy" size={20} color="#666" />
                <Text style={styles.moreMenuText}>复制链接</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreMenuItem}
                onPress={() => {
                  setShowMoreModal(false);
                  // TODO: 实现播放信息
                  Alert.alert('播放信息', `清晰度: ${currentQuality?.name || currentQuality?.quality || '未知'}\n线路: 线路1`);
                }}
              >
                <Icon name="info" size={20} color="#666" />
                <Text style={styles.moreMenuText}>播放信息</Text>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 清晰度选择弹窗 */}
      <Modal
        visible={showQualityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择清晰度</Text>
              <TouchableOpacity onPress={() => setShowQualityModal(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.qualityList}>
              {qualities.map((quality, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.qualityItem,
                    currentQuality === quality && styles.qualityItemActive,
                  ]}
                  onPress={() => {
                    onQualityChange(quality);
                    setShowQualityModal(false);
                  }}
                >
                  <Text
                    style={[
                    styles.qualityItemText,
                      currentQuality === quality &&
                        styles.qualityItemTextActive,
                    ]}
                  >
                    {quality.name || quality.quality || `清晰度${index + 1}`}
                  </Text>
                  {currentQuality === quality && (
                    <Icon name="check" size={20} color="#3498db" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  fullScreenControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullScreenButton: {
    padding: 8,
    marginRight: 12,
  },
  fullScreenHeaderInfo: {
    flex: 1,
    marginRight: 12,
  },
  fullScreenTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  fullScreenHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  fullScreenActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
  },
  fullScreenActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  fullScreenTapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  videoContainer: {
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  headerContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonWhite: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitleWhite: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  qualityButtonHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  qualityButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  qualityButtonTextHeader: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  fullScreenButtonHeader: {
    padding: 8,
    marginLeft: 8,
  },
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  notLiveOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 997,
  },
  notLiveText: {
    fontSize: 16,
    color: '#fff',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 2,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  siteLogo: {
    width: 20,
    height: 20,
  },
  siteName: {
    fontSize: 12,
    color: '#999',
  },
  onlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineText: {
    fontSize: 12,
    color: '#999',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#3498db',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatContainer: {
    flex: 1,
    position: 'relative',
  },
  chatList: {
    padding: 12,
  },
  messageItem: {
    paddingVertical: 4,
  },
  messageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(176, 196, 222, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '80%',
  },
  messageText: {
    color: '#333',
    lineHeight: 20,
  },
  messageUserName: {
    color: '#999',
  },
  systemMessage: {
    marginVertical: 4,
    paddingVertical: 4,
  },
  systemMessageText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  scrollToBottomText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  scContainer: {
    flex: 1,
    padding: 12,
  },
  scItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  scUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  scMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  scPrice: {
    fontSize: 12,
    color: '#ff9800',
    fontWeight: '500',
  },
  settingsContainer: {
    flex: 1,
    padding: 12,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  settingsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
  },
  settingsItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingsItemLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingsItemValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsNumberButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  settingsNumberValue: {
    fontSize: 16,
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  settingsAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingsActionText: {
    fontSize: 14,
    color: '#333',
  },
  moreButtonHeader: {
    padding: 8,
    marginLeft: 8,
  },
  moreMenuList: {
    maxHeight: '70%',
  },
  moreMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  moreMenuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f44336',
    gap: 4,
  },
  followButtonActive: {
    backgroundColor: '#f44336',
  },
  followButtonText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '500',
  },
  followButtonTextActive: {
    color: '#fff',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
    justifyContent: 'space-around',
  },
  bottomActionButton: {
    alignItems: 'center',
    gap: 4,
  },
  bottomActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bottomActionTextActive: {
    color: '#f44336',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorInfo: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  errorButtonPrimary: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  errorButtonText: {
    fontSize: 14,
    color: '#666',
  },
  errorButtonTextPrimary: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  qualityList: {
    padding: 20,
  },
  qualityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  qualityItemActive: {
    backgroundColor: '#e3f2fd',
  },
  qualityItemText: {
    fontSize: 16,
    color: '#333',
  },
  qualityItemTextActive: {
    color: '#3498db',
    fontWeight: '600',
  },
}); 
