import { LiveCategory, LiveSubCategory } from '../model/liveCategory';
import { LiveCategoryResult } from '../model/liveCategoryResult';
import { LiveRoomDetail } from '../model/liveRoomDetail';
import { LivePlayQuality } from '../model/livePlayQuality';
import { LivePlayUrl } from '../model/livePlayUrl';
import { LiveSearchRoomResult, LiveSearchAnchorResult } from '../model/liveSearchResult';
import { LiveSuperChatMessage } from './liveSuperChatMessage';

export interface LiveSite {
  id: string;
  name: string;
  getCategories(): Promise<LiveCategory[]>;
  getCategoryRooms(category: LiveSubCategory, page?: number): Promise<LiveCategoryResult>;
  getRecommendRooms(page?: number): Promise<LiveCategoryResult>;
  getRoomDetail(roomId: string): Promise<LiveRoomDetail>;
  getPlayQualities(detail: LiveRoomDetail): Promise<LivePlayQuality[]>;
  getPlayUrls(detail: LiveRoomDetail, quality: LivePlayQuality): Promise<LivePlayUrl>;
  searchRooms(keyword: string, page?: number): Promise<LiveSearchRoomResult>;
  searchAnchors(keyword: string, page?: number): Promise<LiveSearchAnchorResult>;
  getLiveStatus(roomId: string): Promise<boolean>;
  getSuperChatMessage(roomId: string): Promise<LiveSuperChatMessage[]>;
} 