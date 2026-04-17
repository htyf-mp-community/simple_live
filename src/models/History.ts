// 历史记录数据模型
export interface History {
  id: string; // siteId_roomId
  roomId: string;
  siteId: string;
  userName: string;
  face: string;
  updateTime: string; // ISO 8601 格式
}

export function historyFromJson(json: any): History {
  return {
    id: json.id || '',
    roomId: json.roomId || '',
    siteId: json.siteId || '',
    userName: json.userName || '',
    face: json.face || '',
    updateTime: json.updateTime || new Date().toISOString(),
  };
}

export function historyToJson(history: History): any {
  return {
    id: history.id,
    roomId: history.roomId,
    siteId: history.siteId,
    userName: history.userName,
    face: history.face,
    updateTime: history.updateTime,
  };
}

