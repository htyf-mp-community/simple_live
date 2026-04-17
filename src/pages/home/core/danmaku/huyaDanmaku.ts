import { LiveDanmaku } from '../interface/liveDanmaku';
import { LiveMessage } from '../model/liveMessage';

interface HuyaDanmakuArgs {
  ayyuid: number;
  topSid: number;
  subSid: number;
}

export class HuyaDanmaku implements LiveDanmaku {
  private ws?: WebSocket;
  private messageCallback?: (msg: any) => void;
  private heartbeatTimer?: NodeJS.Timeout;
  private args?: HuyaDanmakuArgs;
  private heartbeatInterval = 60 * 1000; // 60秒心跳
  private serverUrl = 'wss://cdnws.api.huya.com';
  
  // 心跳数据（base64 解码后的二进制数据）
  private readonly heartbeatData = new Uint8Array([
    0x00, 0x14, 0x1d, 0x00, 0x0c, 0x2c, 0x36, 0x00, 0x4c
  ]);

  async connect(args: any): Promise<void> {
    this.args = args as HuyaDanmakuArgs;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.joinRoom();
          this.startHeartbeat();
          if (this.messageCallback) {
            this.messageCallback({ type: 'ready' });
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            this.decodeMessage(new Uint8Array(event.data));
          } else if (event.data instanceof Blob) {
            event.data.arrayBuffer().then((buffer) => {
              this.decodeMessage(new Uint8Array(buffer));
            });
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          this.stopHeartbeat();
          if (this.messageCallback) {
            this.messageCallback({
              type: 'close',
              message: `连接关闭: ${event.code} ${event.reason || ''}`,
            });
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  onMessage(callback: (msg: any) => void): void {
    this.messageCallback = callback;
  }

  private joinRoom() {
    if (!this.args || !this.ws) return;

    const joinData = this.getJoinData(
      this.args.ayyuid,
      this.args.topSid,
      this.args.subSid
    );
    this.ws.send(joinData);
  }

  private getJoinData(ayyuid: number, tid: number, sid: number): ArrayBuffer {
    try {
      // 简化的 TARS 协议实现
      // 实际应该使用完整的 TARS 库，这里先实现基础版本
      const buffer = new ArrayBuffer(100); // 预分配足够空间
      const view = new DataView(buffer);
      let offset = 0;

      // TARS 协议结构（简化版）
      // 写入 ayyuid (tag 0, int)
      view.setUint8(offset++, 0); // tag
      view.setInt32(offset, ayyuid, true);
      offset += 4;

      // 写入 true (tag 1, bool)
      view.setUint8(offset++, 1);
      view.setUint8(offset++, 1);

      // 写入空字符串 (tag 2, string)
      view.setUint8(offset++, 2);
      view.setInt32(offset, 0, true);
      offset += 4;

      // 写入空字符串 (tag 3, string)
      view.setUint8(offset++, 3);
      view.setInt32(offset, 0, true);
      offset += 4;

      // 写入 tid (tag 4, int)
      view.setUint8(offset++, 4);
      view.setInt32(offset, tid, true);
      offset += 4;

      // 写入 sid (tag 5, int)
      view.setUint8(offset++, 5);
      view.setInt32(offset, sid, true);
      offset += 4;

      // 写入 0 (tag 6, int)
      view.setUint8(offset++, 6);
      view.setInt32(offset, 0, true);
      offset += 4;

      // 写入 0 (tag 7, int)
      view.setUint8(offset++, 7);
      view.setInt32(offset, 0, true);
      offset += 4;

      // 外层结构 (tag 0, struct)
      const outerBuffer = new ArrayBuffer(offset + 10);
      const outerView = new DataView(outerBuffer);
      outerView.setUint8(0, 0); // tag
      const innerBuffer = buffer.slice(0, offset);
      outerView.setInt32(1, innerBuffer.byteLength, true);
      const innerView = new Uint8Array(outerBuffer, 5);
      innerView.set(new Uint8Array(innerBuffer));

      return outerBuffer.slice(0, 5 + innerBuffer.byteLength);
    } catch (error) {
      console.error('生成虎牙进房数据失败:', error);
      return new ArrayBuffer(0);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(this.heartbeatData.buffer);
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private decodeMessage(data: Uint8Array) {
    try {
      // TARS 协议解析（简化版）
      // 实际应该使用完整的 TARS 库
      if (data.length < 5) return;

      const view = new DataView(data.buffer, data.byteOffset);
      const type = view.getUint8(0);

      if (type === 7) {
        // 读取嵌套结构
        const innerLength = view.getInt32(1, true);
        if (data.length < 5 + innerLength) return;

        const innerData = data.slice(5, 5 + innerLength);
        this.parsePushMessage(innerData);
      }
    } catch (error) {
      console.error('解析虎牙消息失败:', error);
    }
  }

  private parsePushMessage(data: Uint8Array) {
    try {
      // 简化的 TARS 解析
      // 实际应该使用完整的 TARS 库来解析
      // 这里先实现基础的消息类型判断
      
      // 尝试读取 uri (tag 0)
      let offset = 0;
      if (offset >= data.length) return;
      
      const tag = data[offset++];
      if (tag !== 0) return; // 期望 tag 0
      
      // 读取 int32
      if (offset + 4 > data.length) return;
      const view = new DataView(data.buffer, data.byteOffset + offset);
      const uri = view.getInt32(0, true);
      offset += 4;

      if (uri === 1400) {
        // 弹幕消息
        // 读取 msg (tag 1)
        if (offset >= data.length) return;
        const msgTag = data[offset++];
        if (msgTag !== 1) return;

        // 读取 bytes 长度
        if (offset + 4 > data.length) return;
        const msgLength = view.getInt32(offset - 4, true);
        offset += 4;

        if (offset + msgLength > data.length) return;
        const msgData = data.slice(offset, offset + msgLength);
        
        this.parseDanmakuMessage(msgData);
      } else if (uri === 8006) {
        // 在线人数
        if (offset >= data.length) return;
        const dataTag = data[offset++];
        if (dataTag !== 1) return;

        if (offset + 4 > data.length) return;
        const online = view.getInt32(offset - 4, true);

        if (this.messageCallback) {
          this.messageCallback({
            type: 'online',
            data: online,
          } as LiveMessage);
        }
      }
    } catch (error) {
      console.error('解析推送消息失败:', error);
    }
  }

  private parseDanmakuMessage(data: Uint8Array) {
    try {
      // 简化的弹幕消息解析
      // 实际应该使用完整的 TARS 库
      // 这里先尝试提取基本字段
      
      // 这是一个非常简化的实现，实际应该使用 TARS 库
      // 暂时跳过详细解析，等待完整的 TARS 实现
      console.debug('收到虎牙弹幕消息（需要完整 TARS 解析）');
      
      // TODO: 使用完整的 TARS 库解析消息
      // 需要解析：
      // - userInfo.nickName (用户名)
      // - content (消息内容)
      // - bulletFormat.fontColor (颜色)
    } catch (error) {
      console.error('解析弹幕消息失败:', error);
    }
  }
}
