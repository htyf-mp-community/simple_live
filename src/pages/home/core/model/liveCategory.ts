/**
 * 直播子分类
 */
export interface LiveSubCategory {
  /** 子分类ID */
  id: string;
  /** 子分类名称 */
  name: string;
  /** 父分类ID */
  parentId: string;
  /** 图标URL（可选） */
  pic?: string;
}

/**
 * 直播主分类
 */
export interface LiveCategory {
  /** 主分类ID */
  id: string;
  /** 主分类名称 */
  name: string;
  /** 子分类列表 */
  children: LiveSubCategory[];
} 