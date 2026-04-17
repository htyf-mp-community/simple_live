import { LiveDanmaku } from '../interface/liveDanmaku';
import { LiveMessage } from '../model/liveMessage';

// React Native 兼容的 UTF-8 编码/解码工具
const utf8Encode = (str: string): Uint8Array => {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    if (charCode < 0x80) {
      bytes.push(charCode);
    } else if (charCode < 0x800) {
      bytes.push(0xc0 | (charCode >> 6));
      bytes.push(0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      bytes.push(0xe0 | (charCode >> 12));
      bytes.push(0x80 | ((charCode >> 6) & 0x3f));
      bytes.push(0x80 | (charCode & 0x3f));
    } else {
      i++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(0xf0 | (charCode >> 18));
      bytes.push(0x80 | ((charCode >> 12) & 0x3f));
      bytes.push(0x80 | ((charCode >> 6) & 0x3f));
      bytes.push(0x80 | (charCode & 0x3f));
    }
  }
  return new Uint8Array(bytes);
};

const utf8Decode = (bytes: Uint8Array): string => {
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    let byte1 = bytes[i++];
    if (byte1 < 0x80) {
      result += String.fromCharCode(byte1);
    } else if (byte1 < 0xe0) {
      let byte2 = bytes[i++];
      result += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
    } else if (byte1 < 0xf0) {
      let byte2 = bytes[i++];
      let byte3 = bytes[i++];
      result += String.fromCharCode(
        ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f)
      );
    } else {
      let byte2 = bytes[i++];
      let byte3 = bytes[i++];
      let byte4 = bytes[i++];
      const codePoint =
        ((byte1 & 0x07) << 18) |
        ((byte2 & 0x3f) << 12) |
        ((byte3 & 0x3f) << 6) |
        (byte4 & 0x3f);
      if (codePoint > 0xffff) {
        const surrogate1 = 0xd800 + ((codePoint - 0x10000) >> 10);
        const surrogate2 = 0xdc00 + ((codePoint - 0x10000) & 0x3ff);
        result += String.fromCharCode(surrogate1, surrogate2);
      } else {
        result += String.fromCharCode(codePoint);
      }
    }
  }
  return result;
};

export class DouyuDanmaku implements LiveDanmaku {
  private ws?: WebSocket;
  private messageCallback?: (msg: any) => void;
  private heartbeatTimer?: NodeJS.Timeout;
  private roomId?: string;
  private heartbeatInterval = 45 * 1000; // 45秒心跳
  private serverUrl = 'wss://danmuproxy.douyu.com:8506';

  async connect(args: any): Promise<void> {
    this.roomId = args?.toString() || args?.roomId?.toString() || args;
    
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
    if (!this.roomId || !this.ws) return;

    // 发送登录请求
    const loginData = this.serializeDouyu(`type@=loginreq/roomid@=${this.roomId}/`);
    this.ws.send(loginData);

    // 发送加入房间请求
    const joinData = this.serializeDouyu(`type@=joingroup/rid@=${this.roomId}/gid@=-9999/`);
    this.ws.send(joinData);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const heartbeatData = this.serializeDouyu('type@=mrkl/');
        this.ws.send(heartbeatData);
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private serializeDouyu(body: string): ArrayBuffer {
    try {
      const CLIENT_SEND_TO_SERVER = 689;
      const ENCRYPTED = 0;
      const RESERVED = 0;

      const bodyBytes = utf8Encode(body);
      const bodyLength = bodyBytes.length;
      const packetLength = 4 + 4 + bodyLength + 1;

      const buffer = new ArrayBuffer(packetLength);
      const view = new DataView(buffer);

      // 使用小端序
      view.setUint32(0, packetLength, true); // fullMsgLength
      view.setUint32(4, packetLength, true); // fullMsgLength2
      view.setUint16(8, CLIENT_SEND_TO_SERVER, true); // packType
      view.setUint8(10, ENCRYPTED); // encrypted
      view.setUint8(11, RESERVED); // reserved

      // 写入 body
      const bodyView = new Uint8Array(buffer, 12);
      bodyView.set(bodyBytes);

      // 最后写入 0
      view.setUint8(12 + bodyLength, 0);

      return buffer;
    } catch (error) {
      console.error('序列化斗鱼数据失败:', error);
      return new ArrayBuffer(0);
    }
  }

  private deserializeDouyu(buffer: Uint8Array): string | null {
    try {
      if (buffer.length < 9) return null;

      const view = new DataView(buffer.buffer, buffer.byteOffset);
      
      // 读取 fullMsgLength (小端序)
      const fullMsgLength = view.getUint32(0, true);
      view.getUint32(4, true); // fullMsgLength2 (跳过)
      view.getUint16(8, true); // packType (跳过)
      view.getUint8(10); // encrypted (跳过)
      view.getUint8(11); // reserved (跳过)

      const bodyLength = fullMsgLength - 9;
      if (bodyLength <= 0 || buffer.length < 12 + bodyLength) {
        return null;
      }

      // 读取 body
      const bodyBytes = buffer.slice(12, 12 + bodyLength);
      const text = utf8Decode(bodyBytes);

      // 检查最后一个字节是否为 0
      if (buffer[12 + bodyLength] !== 0) {
        return null;
      }

      return text;
    } catch (error) {
      console.error('反序列化斗鱼数据失败:', error);
      return null;
    }
  }

  private decodeMessage(data: Uint8Array) {
    try {
      const result = this.deserializeDouyu(data);
      if (!result) {
        return;
      }

      const jsonData = this.sttToJObject(result);
      const type = jsonData.type?.toString();

      if (type === 'chatmsg') {
        // 屏蔽阴间弹幕
        if (jsonData.dms == null) {
          return;
        }

        const col = parseInt(jsonData.col?.toString() || '0', 10) || 0;
        const userName = jsonData.nn?.toString() || '';
        const message = jsonData.txt?.toString() || '';

        if (this.messageCallback) {
          this.messageCallback({
            type: 'chat',
            userName,
            content: message,
            message,
            color: this.getColor(col),
          } as LiveMessage);
        }
      }
    } catch (error) {
      console.error('解析斗鱼消息失败:', error);
  }
  }

  // 斗鱼 STT 格式转 JSON 对象
  private sttToJObject(str: string): any {
    if (str.includes('//')) {
      const result: any[] = [];
      for (const field of str.split('//')) {
        if (!field || field.length === 0) {
          continue;
        }
        result.push(this.sttToJObject(field));
      }
      return result;
    }

    if (str.includes('@=')) {
      const result: any = {};
      for (const field of str.split('/')) {
        if (!field || field.length === 0) {
          continue;
        }
        const tokens = field.split('@=');
        if (tokens.length === 2) {
          const k = tokens[0];
          const v = this.unscapeSlashAt(tokens[1]);
          result[k] = this.sttToJObject(v);
        }
      }
      return result;
    } else if (str.includes('@A=')) {
      return this.sttToJObject(this.unscapeSlashAt(str));
    } else {
      return this.unscapeSlashAt(str);
    }
  }

  private unscapeSlashAt(str: string): string {
    return str.replace(/@S/g, '/').replace(/@A/g, '@');
  }

  private getColor(type: number): string {
    switch (type) {
      case 1:
        return '#ff0000'; // 红色
      case 2:
        return '#1e87f0'; // 蓝色
      case 3:
        return '#7ac84b'; // 绿色
      case 4:
        return '#ff7f00'; // 橙色
      case 5:
        return '#9b39f4'; // 紫色
      case 6:
        return '#ff69b4'; // 粉色
      default:
        return '#ffffff'; // 白色
    }
  }
}
