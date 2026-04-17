// 关注服务
import { EventEmitter } from 'events';
import { DBService } from './DBService';
import { FollowUser, FollowUserTag, followUserFromJson } from '../models/FollowUser';
import { Sites } from '../app/sites';
import { LocalStorageService } from './LocalStorageService';

export class FollowService extends EventEmitter {
  private static instance: FollowService;
  private db: DBService;
  private storage: LocalStorageService;
  private updateTimer: NodeJS.Timeout | null = null;

  followList: FollowUser[] = [];
  liveList: FollowUser[] = [];
  notLiveList: FollowUser[] = [];
  followTagList: FollowUserTag[] = [];
  curTagFollowList: FollowUser[] = [];

  updating = false;
  updatedCount = 0;

  private constructor() {
    super();
    this.db = DBService.getInstance();
    this.storage = LocalStorageService.getInstance();
  }

  static getInstance(): FollowService {
    if (!FollowService.instance) {
      FollowService.instance = new FollowService();
    }
    return FollowService.instance;
  }

  // 添加关注
  async addFollow(follow: FollowUser): Promise<void> {
    await this.db.addFollow(follow);
  }

  // 添加标签
  async addFollowUserTag(tagName: string): Promise<FollowUserTag> {
    if (this.followTagList.some(item => item.tag === tagName)) {
      throw new Error('标签名重复');
    }
    const tag = await this.db.addFollowTag(tagName);
    this.followTagList.push(tag);
    return tag;
  }

  // 删除标签
  async delFollowUserTag(tag: FollowUserTag): Promise<void> {
    this.followTagList = this.followTagList.filter(t => t.id !== tag.id);
    await this.db.deleteFollowTag(tag.id);
  }

  // 获取所有标签列表
  async getAllTagList(): Promise<void> {
    this.followTagList = await this.db.getFollowTagList();
  }

  // 更新标签
  updateFollowUserTag(tag: FollowUserTag): void {
    this.db.updateFollowTag(tag);
    const index = this.followTagList.findIndex(t => t.id === tag.id);
    if (index >= 0) {
      this.followTagList[index] = tag;
    }
  }

  // 根据标签筛选数据
  filterDataByTag(tag: FollowUserTag): void {
    this.curTagFollowList = [];
    const toRemove: string[] = [];
    
    for (const id of tag.userId) {
      const follow = this.followList.find(x => x.id === id);
      if (follow) {
        this.curTagFollowList.push(follow);
      } else {
        toRemove.push(id);
      }
    }
    
    // 移除不存在的 userId
    tag.userId = tag.userId.filter(id => !toRemove.includes(id));
    
    if (toRemove.length > 0) {
      this.db.updateFollowTag(tag);
    }
    
    // 按直播状态排序
    this.curTagFollowList.sort((a, b) => (b.liveStatus || 0) - (a.liveStatus || 0));
  }

  // 加载数据
  async loadData(updateStatus = true): Promise<void> {
    this.followList = await this.db.getFollowList();
    await this.getAllTagList();
    
    if (this.followList.length === 0) {
      this.updating = false;
      return;
    }
    
    if (updateStatus) {
      await this.startUpdateStatus();
    } else {
      this.filterData();
    }
  }

  // 开始更新状态
  async startUpdateStatus(): Promise<void> {
    this.updatedCount = 0;
    this.updating = true;

    const threadCount = await this.storage.getValue(
      LocalStorageService.kUpdateFollowThreadCount,
      4
    );

    const chunkSize = Math.ceil(this.followList.length / threadCount);
    const tasks: Promise<void>[] = [];

    for (let i = 0; i < threadCount; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, this.followList.length);
      const items = this.followList.slice(start, end);

      tasks.push(
        (async () => {
          for (const item of items) {
            await this.updateLiveStatus(item);
          }
        })()
      );
    }

    await Promise.all(tasks);
  }

  // 更新直播状态
  async updateLiveStatus(item: FollowUser): Promise<void> {
    try {
      const site = Sites.allSites[item.siteId];
      if (!site) {
        item.liveStatus = 0;
        return;
      }

      const isLiving = await site.liveSite.getLiveStatus(item.roomId);
      item.liveStatus = isLiving ? 2 : 1;

      if (item.liveStatus === 2) {
        try {
          const detail = await site.liveSite.getRoomDetail(item.roomId);
          item.liveStartTime = detail.showTime;
        } catch (error) {
          console.error('Get room detail error:', error);
          // 即使获取详情失败，也保持直播状态
        }
      } else {
        item.liveStartTime = undefined;
      }
    } catch (error) {
      console.error('Update live status error:', error);
      item.liveStatus = 0;
      item.liveStartTime = undefined;
    } finally {
      this.updatedCount++;
      if (this.updatedCount >= this.followList.length) {
        this.filterData();
        this.updating = false;
        this.emit('updated');
      }
    }
  }

  // 筛选数据
  filterData(): void {
    this.followList.sort((a, b) => (b.liveStatus || 0) - (a.liveStatus || 0));
    this.liveList = this.followList.filter(x => x.liveStatus === 2);
    this.notLiveList = this.followList.filter(x => x.liveStatus === 1);
    this.emit('updated');
  }

  // 导出为 JSON
  generateJson(): string {
    const data = this.followList.map(item => ({
      siteId: item.siteId,
      id: item.id,
      roomId: item.roomId,
      userName: item.userName,
      face: item.face,
      addTime: item.addTime,
      tag: item.tag,
    }));
    return JSON.stringify(data, null, 2);
  }

  // 从 JSON 导入
  async inputJson(content: string): Promise<void> {
    const data = JSON.parse(content);
    
    for (const item of data) {
      const follow = followUserFromJson(item);
      
      if (follow.tag !== '全部') {
        const tag = await this.db.addFollowTag(follow.tag);
        if (!tag.userId.includes(follow.id)) {
          tag.userId.push(follow.id);
        }
        await this.db.updateFollowTag(tag);
      }
      
      await this.db.addFollow(follow);
    }
  }

  // 初始化定时器
  initTimer(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.storage.getValue(LocalStorageService.kAutoUpdateFollowEnable, false).then(enabled => {
      if (enabled) {
        this.storage.getValue(LocalStorageService.kUpdateFollowDuration, 10).then(duration => {
          this.updateTimer = setInterval(() => {
            console.log('Update Follow Timer');
            this.loadData();
          }, duration * 60 * 1000);
        });
      }
    });
  }

  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
}

