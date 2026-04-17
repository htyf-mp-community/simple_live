// 数据库服务
import { LocalStorageService } from './LocalStorageService';
import { FollowUser, FollowUserTag } from '../models/FollowUser';
import { History } from '../models/History';

export class DBService {
  private static instance: DBService;
  private storage: LocalStorageService;
  private followListKey = 'followList';
  private followTagListKey = 'followTagList';
  private historyListKey = 'historyList';

  private constructor() {
    this.storage = LocalStorageService.getInstance();
  }

  static getInstance(): DBService {
    if (!DBService.instance) {
      DBService.instance = new DBService();
    }
    return DBService.instance;
  }

  // 关注用户相关
  async getFollowList(): Promise<FollowUser[]> {
    const list = await this.storage.getValue<FollowUser[]>(this.followListKey, []);
    return Array.isArray(list) ? list : [];
  }

  async addFollow(follow: FollowUser): Promise<void> {
    const list = await this.getFollowList();
    const index = list.findIndex(item => item.id === follow.id);
    if (index >= 0) {
      list[index] = follow;
    } else {
      list.push(follow);
    }
    await this.storage.setValue(this.followListKey, list);
  }

  async deleteFollow(id: string): Promise<void> {
    const list = await this.getFollowList();
    const filtered = list.filter(item => item.id !== id);
    await this.storage.setValue(this.followListKey, filtered);
  }

  async getFollow(id: string): Promise<FollowUser | null> {
    const list = await this.getFollowList();
    return list.find(item => item.id === id) || null;
  }

  // 关注标签相关
  async getFollowTagList(): Promise<FollowUserTag[]> {
    const list = await this.storage.getValue<FollowUserTag[]>(this.followTagListKey, []);
    return Array.isArray(list) ? list : [];
  }

  async addFollowTag(tagName: string): Promise<FollowUserTag> {
    const list = await this.getFollowTagList();
    const existing = list.find(tag => tag.tag === tagName);
    if (existing) {
      return existing;
    }
    
    const newTag: FollowUserTag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tag: tagName,
      userId: [],
      order: list.length,
    };
    list.push(newTag);
    await this.storage.setValue(this.followTagListKey, list);
    return newTag;
  }

  async deleteFollowTag(tagId: string): Promise<void> {
    const list = await this.getFollowTagList();
    const filtered = list.filter(tag => tag.id !== tagId);
    await this.storage.setValue(this.followTagListKey, filtered);
  }

  async updateFollowTag(tag: FollowUserTag): Promise<void> {
    const list = await this.getFollowTagList();
    const index = list.findIndex(t => t.id === tag.id);
    if (index >= 0) {
      list[index] = tag;
      await this.storage.setValue(this.followTagListKey, list);
    }
  }

  async updateFollowTagOrder(tags: FollowUserTag[]): Promise<void> {
    tags.forEach((tag, index) => {
      tag.order = index;
    });
    await this.storage.setValue(this.followTagListKey, tags);
  }

  // 历史记录相关
  async getHistoryList(): Promise<History[]> {
    const list = await this.storage.getValue<History[]>(this.historyListKey, []);
    return Array.isArray(list) ? list : [];
  }

  async getHistory(id: string): Promise<History | null> {
    const list = await this.getHistoryList();
    return list.find(item => item.id === id) || null;
  }

  async addOrUpdateHistory(history: History): Promise<void> {
    const list = await this.getHistoryList();
    const index = list.findIndex(item => item.id === history.id);
    if (index >= 0) {
      list[index] = history;
    } else {
      list.push(history);
    }
    // 按更新时间倒序排列
    list.sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime());
    await this.storage.setValue(this.historyListKey, list);
  }

  async deleteHistory(id: string): Promise<void> {
    const list = await this.getHistoryList();
    const filtered = list.filter(item => item.id !== id);
    await this.storage.setValue(this.historyListKey, filtered);
  }

  async clearHistory(): Promise<void> {
    await this.storage.setValue(this.historyListKey, []);
  }
}

