# ts 直播平台 TypeScript SDK 示例

## 安装依赖

```bash
npm install axios
```

## 目录结构

- api/         四大平台主逻辑
- model/       类型定义
- common/      工具函数
- interface/   通用接口
- danmaku/     弹幕协议结构

## 示例用法

```typescript
import { BilibiliSite, DouyinSite, DouyuSite, HuyaSite } from './src/api';
import { BilibiliDanmaku } from './src/danmaku/bilibiliDanmaku';

async function main() {
  // 1. 初始化平台
  const bili = new BilibiliSite();

  // 2. 获取直播分类
  const categories = await bili.getCategories();
  console.log('B站直播分类:', categories);

  // 3. 获取某分类下房间
  const rooms = await bili.getCategoryRooms(categories[0].children[0]);
  console.log('房间列表:', rooms.items);

  // 4. 获取房间详情
  const detail = await bili.getRoomDetail(rooms.items[0].roomId);
  console.log('房间详情:', detail);

  // 5. 连接弹幕（伪代码，需补全协议）
  const danmaku = new BilibiliDanmaku();
  await danmaku.connect(detail.danmakuData);
  danmaku.onMessage((msg) => {
    console.log('收到弹幕消息:', msg);
  });
}

main();
```

## 类型安全
所有平台、数据结构、弹幕协议均有 TypeScript 类型提示。

## 贡献
如需补全协议、适配更多平台，欢迎 PR！ 