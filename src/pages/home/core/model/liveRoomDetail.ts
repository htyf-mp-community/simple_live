export interface LiveRoomDetail {
  roomId: string;
  title: string;
  cover: string;
  userName: string;
  userAvatar?: string;
  online: number;
  status: boolean;
  url: string;
  introduction?: string;
  notice?: string;
  danmakuData?: any;
  data?: any;
  isRecord?: boolean;
  showTime?: string; // 开播时间戳
} 