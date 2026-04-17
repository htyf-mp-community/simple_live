// 常量定义
export const Constants = {
  kUpdateFollow: "UpdateFollow",
  kUpdateHistory: "UpdateHistory",
  
  kBiliBili: "bilibili",
  kDouyu: "douyu",
  kHuya: "huya",
  kDouyin: "douyin",
};

// 首页项配置
export interface HomePageItem {
  iconName: string; // React Native 图标名称
  title: string;
  index: number;
}

export const allHomePages: Record<string, HomePageItem> = {
  recommend: {
    iconName: "home",
    title: "首页",
    index: 0,
  },
  follow: {
    iconName: "heart",
    title: "关注",
    index: 1,
  },
  category: {
    iconName: "grid",
    title: "分类",
    index: 2,
  },
  user: {
    iconName: "user",
    title: "我的",
    index: 3,
  },
};

