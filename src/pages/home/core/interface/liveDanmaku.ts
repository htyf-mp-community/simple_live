export interface LiveDanmaku {
  connect(args: any): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(callback: (msg: any) => void): void;
} 