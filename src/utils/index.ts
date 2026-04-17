// 工具函数
import { Platform, Alert, Clipboard } from 'react-native';
import { format, parseISO, isToday, isThisYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export class Utils {
  // 时间格式化
  static parseTime(date: Date | string | null | undefined): string {
    if (!date) {
      return "";
    }
    
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();
    
    if (isToday(dateObj)) {
      return format(dateObj, 'HH:mm', { locale: zhCN });
    }
    
    if (isThisYear(dateObj)) {
      return format(dateObj, 'MM-dd HH:mm', { locale: zhCN });
    }
    
    return format(dateObj, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  }

  // 显示提示对话框
  static async showAlertDialog(
    content: string,
    options: {
      title?: string;
      confirm?: string;
      cancel?: string;
    } = {}
  ): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        options.title || '',
        content,
        [
          {
            text: options.cancel || '取消',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: options.confirm || '确定',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true }
      );
    });
  }

  // 显示消息对话框
  static async showMessageDialog(
    content: string,
    options: {
      title?: string;
      confirm?: string;
    } = {}
  ): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        options.title || '',
        content,
        [
          {
            text: options.confirm || '确定',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true }
      );
    });
  }

  // 版本号解析
  static parseVersion(version: string): number {
    const parts = version.split('.');
    let num = "";
    for (const part of parts) {
      num += part.padStart(2, '0');
    }
    return parseInt(num, 10);
  }

  // 在线人数格式化
  static onlineToString(num: number): string {
    if (num >= 10000) {
      return `${(num / 10000.0).toFixed(1)}万`;
    }
    return num.toString();
  }

  // 16进制颜色转换
  static convertHexColor(hexColor: string): string {
    hexColor = hexColor.replace(/#/g, "");
    if (hexColor.length === 4) {
      hexColor = "00" + hexColor;
    }
    
    if (hexColor.length === 6) {
      return `#${hexColor}`;
    }
    
    if (hexColor.length === 8) {
      return `#${hexColor.substring(2)}`;
    }
    
    return '#ffffff';
  }

  // 复制到剪贴板
  static async copyToClipboard(text: string): Promise<void> {
    try {
      await Clipboard.setString(text);
      // 可以显示 Toast 提示
    } catch (error) {
      console.error('Copy to clipboard error', error);
    }
  }

  // 获取剪贴板内容
  static async getClipboard(): Promise<string | null> {
    try {
      const content = await Clipboard.getString();
      return content || null;
    } catch (error) {
      console.error('Get clipboard error', error);
      return null;
    }
  }

  // 检查是否为正则格式
  static isRegexFormat(keyword: string): boolean {
    return keyword.startsWith('/') && keyword.endsWith('/') && keyword.length > 2;
  }

  // 移除正则格式
  static removeRegexFormat(keyword: string): string {
    return keyword.substring(1, keyword.length - 1);
  }

  // 文件大小格式化
  static parseFileSize(size: number): string {
    if (size < 1024) {
      return `${size} B`;
    }
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    }
    if (size < 1024 * 1024 * 1024) {
      return `${(size / 1024 / 1024).toFixed(2)} MB`;
    }
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
}
