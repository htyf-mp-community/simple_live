// WebSocket 工具类
export interface WebSocketConfig {
  url: string;
  backupUrl?: string;
  headers?: Record<string, string>;
  onOpen?: () => void;
  onMessage?: (data: ArrayBuffer) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export class WebScoketUtils {
  private ws?: WebSocket;
  private config: WebSocketConfig;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, [], {
          headers: this.config.headers,
        } as any);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.config.onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            this.config.onMessage?.(event.data);
          } else if (event.data instanceof Blob) {
            event.data.arrayBuffer().then((buffer) => {
              this.config.onMessage?.(buffer);
            });
          } else {
            // 文本消息转换为 ArrayBuffer（React Native 兼容）
            const str = typeof event.data === 'string' ? event.data : String(event.data);
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) {
              bytes[i] = str.charCodeAt(i);
            }
            this.config.onMessage?.(bytes.buffer);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error);
          this.config.onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.config.onClose?.();
          this.tryReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(data: ArrayBuffer | Uint8Array): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (data instanceof Uint8Array) {
        this.ws.send(data.buffer);
      } else {
        this.ws.send(data);
      }
    }
  }

  close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  private tryReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket 重连次数已达上限');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    this.reconnectTimer = setTimeout(() => {
      const url = this.reconnectAttempts > 2 && this.config.backupUrl
        ? this.config.backupUrl
        : this.config.url;
      
      console.log(`尝试重连 WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.config.url = url;
      this.connect().catch((error) => {
        console.error('WebSocket 重连失败:', error);
      });
    }, delay);
  }
}

