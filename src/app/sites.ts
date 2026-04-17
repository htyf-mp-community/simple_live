// 直播平台配置
import { Constants } from './constants';
import { BilibiliSite, DouyinSite, DouyuSite, HuyaSite } from '../pages/home/core/api';

export interface Site {
  id: string;
  name: string;
  logo: any; // 图片资源，可以是 require() 或 ImageSource
  liveSite: any; // LiveSite 类型
}

// 图片资源 - 使用静态 require（React Native 要求）
// 如果图片不存在，需要先复制图片文件到 assets/images 目录
let bilibiliLogo: any;
let douyuLogo: any;
let huyaLogo: any;
let douyinLogo: any;

try {
  bilibiliLogo = require('../assets/images/bilibili_2.png');
} catch {
  bilibiliLogo = null;
}

try {
  douyuLogo = require('../assets/images/douyu.png');
} catch {
  douyuLogo = null;
}

try {
  huyaLogo = require('../assets/images/huya.png');
} catch {
  huyaLogo = null;
}

try {
  douyinLogo = require('../assets/images/douyin.png');
} catch {
  douyinLogo = null;
}

export class Sites {
  static allSites: Record<string, Site> = {
    [Constants.kBiliBili]: {
      id: Constants.kBiliBili,
      logo: bilibiliLogo,
      name: "哔哩哔哩",
      liveSite: new BilibiliSite(),
    },
    [Constants.kDouyu]: {
      id: Constants.kDouyu,
      logo: douyuLogo,
      name: "斗鱼直播",
      liveSite: new DouyuSite(),
    },
    [Constants.kHuya]: {
      id: Constants.kHuya,
      logo: huyaLogo,
      name: "虎牙直播",
      liveSite: new HuyaSite(),
    },
    [Constants.kDouyin]: {
      id: Constants.kDouyin,
      logo: douyinLogo,
      name: "抖音直播",
      liveSite: new DouyinSite(),
    },
  };

  static getSupportSites(siteSort: string[]): Site[] {
    return siteSort
      .map((key) => Sites.allSites[key])
      .filter(Boolean);
  }
}

