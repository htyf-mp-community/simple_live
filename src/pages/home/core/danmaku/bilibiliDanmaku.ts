import { LiveDanmaku } from '../interface/liveDanmaku';
import { LiveMessage } from '../model/liveMessage';
import { LiveSuperChatMessage } from '../interface/liveSuperChatMessage';

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
      // 代理对
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

interface BilibiliDanmakuArgs {
  roomId: number;
  token: string;
  serverHost: string;
  buvid: string;
  uid: number;
  cookie: string;
}

export class BilibiliDanmaku implements LiveDanmaku {
  private ws?: WebSocket;
  private messageCallback?: (msg: any) => void;
  private heartbeatTimer?: NodeJS.Timeout;
  private args?: BilibiliDanmakuArgs;
  private heartbeatInterval = 60 * 1000; // 60秒心跳

  async connect(args: any): Promise<void> {
    this.args = args as BilibiliDanmakuArgs;
    const wsUrl = `wss://${args.serverHost}/sub`;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl, [], {
          headers: args.cookie ? { cookie: args.cookie } : undefined,
        } as any);

    this.ws.onopen = () => {
          // 发送进房包
          this.joinRoom();
          // 开始心跳
          this.startHeartbeat();
          resolve();
    };

    this.ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            this.decodeMessage(new Uint8Array(event.data));
          } else if (event.data instanceof Blob) {
            event.data.arrayBuffer().then((buffer) => {
              this.decodeMessage(new Uint8Array(buffer));
            });
          } else {
            // 文本消息（不应该出现）
            console.warn('收到文本消息:', event.data);
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

    // 使用协议版本 1（JSON，无压缩）而不是 3（brotli压缩）
    // 这样可以避免需要 brotli 解压库
    const joinData = {
      uid: this.args.uid,
      roomid: this.args.roomId,
      protover: 1, // 改为 1，避免 brotli 压缩
      buvid: this.args.buvid,
      platform: 'web',
      type: 2,
      key: this.args.token,
    };

    const packet = this.encodeData(JSON.stringify(joinData), 7);
    this.ws.send(packet);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const packet = this.encodeData('', 2);
        this.ws.send(packet);
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private encodeData(msg: string, action: number): ArrayBuffer {
    const data = utf8Encode(msg);
    const length = data.length + 16;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    // 数据包长度 (4 bytes)
    view.setUint32(0, length, false);
    // 数据包头部长度,固定16 (2 bytes)
    view.setUint16(4, 16, false);
    // 协议版本，0=JSON,1=Int32,2=Buffer (2 bytes)
    view.setUint16(6, 0, false);
    // 操作类型 (4 bytes)
    view.setUint32(8, action, false);
    // 数据包头部长度,固定1 (4 bytes)
    view.setUint32(12, 1, false);

    // 写入数据
    const dataView = new Uint8Array(buffer, 16);
    dataView.set(data);

    return buffer;
  }

  private decodeMessage(data: Uint8Array) {
    try {
      if (data.length < 16) return;

      const view = new DataView(data.buffer, data.byteOffset);
      
      // 协议版本 (offset 6, 2 bytes)
      const protocolVersion = view.getUint16(6, false);
      // 操作类型 (offset 8, 4 bytes)
      const operation = view.getUint32(8, false);
      // 内容 (offset 16)
      const body = data.slice(16);

      if (operation === 3) {
        // 心跳回应，内容为房间人气值
        if (body.length >= 4) {
          const online = view.getUint32(16, false);
          if (this.messageCallback) {
            this.messageCallback({
              type: 'online',
              data: online,
            } as LiveMessage);
          }
        }
      } else if (operation === 5) {
        // 通知，弹幕、广播等全部信息
        this.parseNotification(body, protocolVersion);
      } else if (operation === 8) {
        // 进房回应，空
        if (this.messageCallback) {
          this.messageCallback({
            type: 'ready',
          });
        }
      }
    } catch (error) {
      console.error('解析消息失败:', error);
    }
  }

  private parseNotification(body: Uint8Array, protocolVersion: number) {
    try {
      // 根据协议版本处理
      if (protocolVersion === 2) {
        // zlib 压缩（React Native 中需要额外库）
        // 压缩数据无法直接解析，需要先解压
        // 暂时跳过，避免解析错误
        console.debug('收到 zlib 压缩数据，跳过（需要解压库支持）');
        return;
      } else if (protocolVersion === 3) {
        // brotli 压缩（React Native 中需要额外库）
        // 压缩数据无法直接解析，需要先解压
        // 暂时跳过，避免解析错误
        console.debug('收到 brotli 压缩数据，跳过（需要解压库支持）');
        return;
      }

      // 协议版本 0 或 1，直接解析 JSON
      const text = utf8Decode(body);
      
      // 分割多个 JSON 对象（以控制字符分隔）
      const groups = text.split(/[\x00-\x1f]+/).filter((item) => item.length > 2 && item.startsWith('{'));
      
      for (const jsonStr of groups) {
        try {
          this.parseMessage(jsonStr);
        } catch (parseError) {
          // 单个消息解析失败不影响其他消息
          console.debug('解析单个消息失败:', parseError);
        }
      }
    } catch (error) {
      // 只有非压缩数据才会到这里，如果失败可能是数据格式问题
      console.error('解析通知失败:', error);
    }
  }

  private parseMessage(jsonMessage: string) {
    try {
      const obj = JSON.parse(jsonMessage);
      const cmd = obj.cmd?.toString() || '';

      if (cmd.includes('DANMU_MSG')) {
        // 弹幕消息
        if (obj.info && Array.isArray(obj.info) && obj.info.length > 0) {
          const message = obj.info[1]?.toString() || '';
          const color = obj.info[0]?.[3] || 0;
          const username = obj.info[2]?.[1]?.toString() || '';

          if (this.messageCallback) {
            this.messageCallback({
              type: 'chat',
              userName: username,
              content: message,
              message: message,
              color: color === 0 ? '#ffffff' : this.numberToColor(color),
            } as LiveMessage);
          }
        }
      } else if (cmd === 'SUPER_CHAT_MESSAGE') {
        // 超级留言
        if (obj.data) {
          const sc: LiveSuperChatMessage = {
            backgroundBottomColor: obj.data.background_bottom_color?.toString() || '',
            backgroundColor: obj.data.background_color?.toString() || '',
            endTime: new Date(obj.data.end_time * 1000),
            face: `${obj.data.user_info?.face || ''}@200w.jpg`,
            message: obj.data.message?.toString() || '',
            price: obj.data.price || 0,
            startTime: new Date(obj.data.start_time * 1000),
            userName: obj.data.user_info?.uname?.toString() || '',
          };

          if (this.messageCallback) {
            this.messageCallback({
              type: 'superChat',
              data: sc,
            } as LiveMessage);
          }
        }
      }
    } catch (error) {
      console.error('解析消息 JSON 失败:', error);
    }
  }

  private numberToColor(color: number): string {
    // 将数字颜色转换为十六进制
    const hex = color.toString(16).padStart(6, '0');
    return `#${hex}`;
  }
}
