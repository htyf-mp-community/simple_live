// 抖音弹幕协议实现
import { LiveDanmaku } from '../interface/liveDanmaku';
import { LiveMessage } from '../model/liveMessage';
import { WebScoketUtils } from '../common/webSocketUtils';

const kDefaultUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0";

export interface DouyinDanmakuArgs {
  webRid: string;
  roomId: string;
  userId: string;
  cookie: string;
}

export class DouyinDanmaku implements LiveDanmaku {
  private ws: WebScoketUtils | null = null;
  private messageCallback: ((msg: LiveMessage) => void) | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTime = 10 * 1000; // 10秒心跳
  private serverUrl = "wss://webcast3-ws-web-lq.douyin.com/webcast/im/push/v2/";
  private danmakuArgs: DouyinDanmakuArgs | null = null;
  private getSignatureFunction: ((roomId: string, uniqueId: string) => Promise<string>) | null = null;

  /**
   * 设置签名函数（用于抖音弹幕连接）
   * @param func 签名函数，接收 roomId 和 uniqueId，返回签名字符串
   */
  setSignatureFunction(func: (roomId: string, uniqueId: string) => Promise<string>): void {
    this.getSignatureFunction = func;
  }

  async connect(args: any): Promise<void> {
    this.danmakuArgs = args as DouyinDanmakuArgs;

    if (!this.danmakuArgs) {
      throw new Error('抖音弹幕参数错误');
    }

    const ts = Date.now();
    const params = new URLSearchParams({
      "app_name": "douyin_web",
      "version_code": "180800",
      "webcast_sdk_version": "1.3.0",
      "update_version_code": "1.3.0",
      "compress": "gzip",
      "cursor": `h-1_t-${ts}_r-1_d-1_u-1`,
      "host": "https://live.douyin.com",
      "aid": "6383",
      "live_id": "1",
      "did_rule": "3",
      "debug": "false",
      "maxCacheMessageNumber": "20",
      "endpoint": "live_pc",
      "support_wrds": "1",
      "im_path": "/webcast/im/fetch/",
      "user_unique_id": this.danmakuArgs.userId,
      "device_platform": "web",
      "cookie_enabled": "true",
      "screen_width": "1920",
      "screen_height": "1080",
      "browser_language": "zh-CN",
      "browser_platform": "Win32",
      "browser_name": "Mozilla",
      "browser_version": "5.0",
      "browser_online": "true",
      "tz_name": "Asia/Shanghai",
      "identity": "audience",
      "room_id": this.danmakuArgs.roomId,
      "heartbeatDuration": "0",
    });

    // 获取签名（使用外部设置的签名函数，如果没有则返回空字符串）
    const signature = await this.getSignature(this.danmakuArgs.roomId, this.danmakuArgs.userId);
    const url = `${this.serverUrl}?${params.toString()}&signature=${signature}`;
    const backupUrl = url.replace("webcast3-ws-web-lq", "webcast5-ws-web-lf");

    this.ws = new WebScoketUtils({
      url,
      backupUrl,
      headers: {
        "User-Agent": kDefaultUserAgent,
        "Cookie": this.danmakuArgs.cookie,
        "Origin": "https://live.douyin.com"
      },
      onOpen: () => {
        this.joinRoom();
      },
      onMessage: (data: ArrayBuffer) => {
        this.decodeMessage(data);
      },
      onError: (error: any) => {
        console.error('抖音弹幕 WebSocket 错误:', error);
      },
      onClose: () => {
        console.log('抖音弹幕 WebSocket 关闭');
        this.stopHeartbeat();
      },
    });

    await this.ws.connect();
    this.startHeartbeat();
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageCallback = null;
  }

  onMessage(callback: (msg: LiveMessage) => void): void {
    this.messageCallback = callback;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.heartbeat();
    }, this.heartbeatTime);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private heartbeat(): void {
    if (!this.ws) return;

    // 抖音心跳消息需要 protobuf 编码
    // 暂时发送空消息，需要完整的 protobuf 实现
    try {
      // TODO: 实现 protobuf PushFrame 编码
      // const pushFrame = PushFrame.create({ payloadType: 'hb' });
      // this.ws.send(pushFrame.toArrayBuffer());
      console.debug('抖音弹幕心跳（需要 protobuf 支持）');
    } catch (error) {
      console.error('抖音弹幕心跳失败:', error);
    }
  }

  private joinRoom(): void {
    if (!this.ws) return;

    // 加入房间消息也需要 protobuf 编码
    // 暂时发送心跳消息作为占位
    this.heartbeat();
  }

  private decodeMessage(data: ArrayBuffer): void {
    try {
      // 抖音使用 protobuf 协议，需要解析 PushFrame
      // TODO: 实现 protobuf PushFrame 解码
      // const pushFrame = PushFrame.decode(new Uint8Array(data));
      // const decompressed = gzip.decode(pushFrame.payload);
      // const response = Response.decode(decompressed);
      
      // 暂时跳过，需要完整的 protobuf 库支持
      console.debug('抖音弹幕消息（需要 protobuf 支持）:', data.byteLength, 'bytes');
      
      // 示例：解析消息
      // if (response.needAck) {
      //   this.sendAck(pushFrame.logId, response.internalExt);
      // }
      // for (const msg of response.messagesList) {
      //   if (msg.method === 'WebcastChatMessage') {
      //     this.unPackWebcastChatMessage(msg.payload);
      //   } else if (msg.method === 'WebcastRoomUserSeqMessage') {
      //     this.unPackWebcastRoomUserSeqMessage(msg.payload);
      //   }
      // }
    } catch (error) {
      console.error('抖音弹幕消息解析失败:', error);
    }
  }

  private unPackWebcastChatMessage(payload: Uint8Array): void {
    try {
      // TODO: 实现 ChatMessage protobuf 解码
      // const chatMessage = ChatMessage.decode(payload);
      // if (this.messageCallback) {
      //   this.messageCallback({
      //     type: 'chat',
      //     content: chatMessage.content,
      //     userName: chatMessage.user.nickName,
      //     color: 'white',
      //   });
      // }
    } catch (error) {
      console.error('解析抖音聊天消息失败:', error);
    }
  }

  private unPackWebcastRoomUserSeqMessage(payload: Uint8Array): void {
    try {
      // TODO: 实现 RoomUserSeqMessage protobuf 解码
      // const roomUserSeqMessage = RoomUserSeqMessage.decode(payload);
      // if (this.messageCallback) {
      //   this.messageCallback({
      //     type: 'online',
      //     content: '',
      //     userName: '',
      //     data: roomUserSeqMessage.totalUser.toInt(),
      //   });
      // }
    } catch (error) {
      console.error('解析抖音在线人数消息失败:', error);
    }
  }

  private sendAck(logId: number, internalExt: string): void {
    if (!this.ws) return;

    // TODO: 实现 protobuf PushFrame 编码发送 ACK
    // const pushFrame = PushFrame.create({
    //   payloadType: 'ack',
    //   logId,
    //   internalExt,
    // });
    // this.ws.send(pushFrame.toArrayBuffer());
  }

  private async getSignature(roomId: string, uniqueId: string): Promise<string> {
    // 如果设置了签名函数，使用外部函数获取签名
    if (this.getSignatureFunction) {
      return await this.getSignatureFunction(roomId, uniqueId);
    }
    // 如果没有设置签名函数，返回空字符串（与 Flutter 的默认行为一致）
    console.warn('DouyinDanmaku.getSignature: 未设置签名函数，返回空字符串');
    return "";
  }
}
 