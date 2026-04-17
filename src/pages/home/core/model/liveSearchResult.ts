import { LiveRoomItem } from './liveRoomItem';

export interface LiveSearchRoomResult {
  hasMore: boolean;
  items: LiveRoomItem[];
}

export interface LiveAnchorItem {
  roomId: string;
  avatar: string;
  userName: string;
  liveStatus: boolean;
}

export interface LiveSearchAnchorResult {
  hasMore: boolean;
  items: LiveAnchorItem[];
} 