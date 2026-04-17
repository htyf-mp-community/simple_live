// 关注用户数据模型
export interface FollowUser {
  id: string; // siteId_roomId
  roomId: string;
  siteId: string;
  userName: string;
  face: string;
  addTime: string; // ISO 8601 格式
  tag: string;
  liveStatus?: number; // 0=未知(加载中) 1=未开播 2=直播中
  liveStartTime?: string; // 开播时间戳
}

export interface FollowUserTag {
  id: string;
  tag: string;
  userId: string[];
  order?: number; // 排序
}

export function followUserFromJson(json: any): FollowUser {
  return {
    id: json.id || '',
    roomId: json.roomId || '',
    siteId: json.siteId || '',
    userName: json.userName || '',
    face: json.face || '',
    addTime: json.addTime || new Date().toISOString(),
    tag: json.tag || '全部',
    liveStatus: json.liveStatus || 0,
    liveStartTime: json.liveStartTime,
  };
}

export function followUserToJson(user: FollowUser): any {
  return {
    id: user.id,
    roomId: user.roomId,
    siteId: user.siteId,
    userName: user.userName,
    face: user.face,
    addTime: user.addTime,
    tag: user.tag,
  };
}

