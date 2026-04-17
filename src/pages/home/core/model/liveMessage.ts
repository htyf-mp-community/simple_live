/**
 * 直播消息通用类型
 */
export interface LiveMessage {
  /** 消息类型，如 danmaku、gift、system、superchat 等 */
  type: string;
  /** 消息内容文本 */
  content: string;
  /** 发送者用户名 */
  userName?: string;
  /** 发送者头像 */
  userAvatar?: string;
  /** 消息时间戳（毫秒） */
  time?: number;
  /** 其它平台自定义字段 */
  [key: string]: any;
}

/**
 * 弹幕消息类型
 */
export interface DanmakuMessage extends LiveMessage {
  type: 'danmaku';
  color?: string;
  isVip?: boolean;
  isAdmin?: boolean;
}

/**
 * 礼物消息类型
 */
export interface GiftMessage extends LiveMessage {
  type: 'gift';
  giftName: string;
  giftCount: number;
  price?: number;
}

/**
 * 系统消息类型
 */
export interface SystemMessage extends LiveMessage {
  type: 'system';
} 