// 本地存储服务
import AsyncStorage from '@react-native-async-storage/async-storage';

export class LocalStorageService {
  private static instance: LocalStorageService;

  static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  // 存储键名常量
  static readonly kFirstRun = "FirstRun";
  static readonly kPlayerScaleMode = "ScaleMode";
  static readonly kSiteSort = "SiteSort";
  static readonly kHomeSort = "HomeSort";
  static readonly kThemeMode = "ThemeMode";
  static readonly kDebugModeKey = "DebugMode";
  static readonly kDanmuSize = "DanmuSize";
  static readonly kDanmuSpeed = "DanmuSpeed";
  static readonly kDanmuArea = "DanmuArea";
  static readonly kDanmuOpacity = "DanmuOpacity";
  static readonly kDanmuStrokeWidth = "DanmuStrokeWidth";
  static readonly kDanmuHideScroll = "DanmuHideScroll";
  static readonly kDanmuHideBottom = "DanmuHideBottom";
  static readonly kDanmuHideTop = "DanmuHideTop";
  static readonly kDanmuTopMargin = "DanmuTopMargin";
  static readonly kDanmuBottomMargin = "DanmuBottomMargin";
  static readonly kDanmuEnable = "DanmuEnable";
  static readonly kDanmuFontWeight = "DanmuFontWeight";
  static readonly kHardwareDecode = "HardwareDecode";
  static readonly kChatTextSize = "ChatTextSize";
  static readonly kChatTextGap = "ChatTextGap";
  static readonly kChatBubbleStyle = "ChatBubbleStyle";
  static readonly kQualityLevel = "QualityLevel";
  static readonly kQualityLevelCellular = "QualityLevelCellular";
  static readonly kAutoExitEnable = "AutoExitEnable";
  static readonly kAutoExitDuration = "AutoExitDuration";
  static readonly kRoomAutoExitDuration = "RoomAutoExitDuration";
  static readonly kPlayerCompatMode = "PlayerCompatMode";
  static readonly kPlayerAutoPause = "PlayerAutoPause";
  static readonly kPlayerBufferSize = "PlayerBufferSize";
  static readonly kPlayerForceHttps = "PlayerForceHttps";
  static readonly kAutoFullScreen = "AutoFullScreen";
  static readonly kPlayerShowSuperChat = "PlayerShowSuperChat";
  static readonly kPlayerVolume = "PlayerVolume";
  static readonly kPIPHideDanmu = "PIPHideDanmu";
  static readonly kBilibiliCookie = "BilibiliCookie";
  static readonly kStyleColor = "kStyleColor";
  static readonly kIsDynamic = "kIsDynamic";
  static readonly kBilibiliLoginTip = "BilibiliLoginTip";
  static readonly kLogEnable = "LogEnable";
  static readonly kCustomPlayerOutput = "CustomPlayerOutput";
  static readonly kVideoOutputDriver = "VideoOutputDriver";
  static readonly kVideoHardwareDecoder = "VideoHardwareDecoder";
  static readonly kAudioOutputDriver = "AudioOutputDriver";
  static readonly kAutoUpdateFollowEnable = "AutoUpdateFollowEnable";
  static readonly kUpdateFollowDuration = "AutoUpdateFollowDuration";
  static readonly kUpdateFollowThreadCount = "UpdateFollowThreadCount";
  static readonly kWebDAVUri = "WebDAVUri";
  static readonly kWebDAVUser = "WebDAVUser";
  static readonly kWebDAVPassword = "kWebDAVPassword";
  static readonly kWebDAVLastUploadTime = "kWebDAVLastUploadTime";
  static readonly kWebDAVLastRecoverTime = "kWebDAVLastRecoverTime";

  // 弹幕屏蔽列表的键前缀
  private static readonly SHIELD_PREFIX = "DanmuShield_";

  async getValue<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) {
        return defaultValue;
      }
      // 尝试解析 JSON
      try {
        return JSON.parse(value) as T;
      } catch {
        // 如果不是 JSON，直接返回字符串
        return value as T;
      }
    } catch (error) {
      console.error(`Get LocalStorage error: ${key}`, error);
      return defaultValue;
    }
  }

  async setValue<T>(key: string, value: T): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await AsyncStorage.setItem(key, stringValue);
    } catch (error) {
      console.error(`Set LocalStorage error: ${key}`, error);
    }
  }

  async removeValue(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Remove LocalStorage error: ${key}`, error);
    }
  }

  // 弹幕屏蔽相关方法
  async getShieldList(): Promise<Set<string>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const shieldKeys = keys.filter(key => key.startsWith(LocalStorageService.SHIELD_PREFIX));
      const values = await AsyncStorage.multiGet(shieldKeys);
      return new Set(values.map(([_, value]) => value || '').filter(Boolean));
    } catch (error) {
      console.error('Get shield list error', error);
      return new Set();
    }
  }

  async addShield(keyword: string): Promise<void> {
    await this.setValue(`${LocalStorageService.SHIELD_PREFIX}${keyword}`, keyword);
  }

  async removeShield(keyword: string): Promise<void> {
    await this.removeValue(`${LocalStorageService.SHIELD_PREFIX}${keyword}`);
  }

  async clearShield(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const shieldKeys = keys.filter(key => key.startsWith(LocalStorageService.SHIELD_PREFIX));
      await AsyncStorage.multiRemove(shieldKeys);
    } catch (error) {
      console.error('Clear shield error', error);
    }
  }
}

