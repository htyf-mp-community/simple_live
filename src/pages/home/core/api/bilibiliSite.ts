import axios from 'axios';
import md5 from 'md5';
import urlParser from 'url-parse';
import { asT } from '../common/convertHelper';
import { LiveCategory, LiveSubCategory } from '../model/liveCategory';
import { LiveCategoryResult } from '../model/liveCategoryResult';
import { LiveRoomDetail } from '../model/liveRoomDetail';
import { LivePlayQuality } from '../model/livePlayQuality';
import { LivePlayUrl } from '../model/livePlayUrl';
import { LiveSearchRoomResult, LiveSearchAnchorResult } from '../model/liveSearchResult';
import { LiveSuperChatMessage } from '../interface/liveSuperChatMessage';

// Bilibili 直播站点相关API封装
export class BilibiliSite {
  id = "bilibili"; // 站点ID
  name = "哔哩哔哩直播"; // 站点名称
  cookie = "buvid4=4FF0C693-6A36-2D3D-719B-8A716FF87BE978006-022071921-ISMe0ZcZC2gXIxNMj9RriA%3D%3D; CURRENT_BLACKGAP=0; header_theme_version=CLOSE; enable_web_push=DISABLE; buvid_fp=c0dca776ea03309ebcd3aa4bf6f7783d; _uuid=E8F10BD82-4694-FC92-14102-F75B64266691034448infoc; buvid3=BACC3568-05DC-2AEC-F506-634021A7B34102845infoc; b_nut=1724417602; hit-dyn-v2=1; LIVE_BUVID=AUTO2217335698165281; CURRENT_QUALITY=80; rpdid=|(ku|u)k)YYu0J'u~J)~kJ~l); enable_feed_channel=ENABLE; PVID=1; DedeUserID=13560880; DedeUserID__ckMd5=7e2c8314e5922304; home_feed_column=5; browser_resolution=1681-958; bili_ticket=eyJhbGciOiJIUzI1NiIsImtpZCI6InMwMyIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTE2ODQ4MTksImlhdCI6MTc1MTQyNTU1OSwicGx0IjotMX0.28Cg0KscxzgGEOmIAeYyNXRPzRig-MYhFeHc3R9XsXw; bili_ticket_expires=1751684759; SESSDATA=223beba6%2C1766977620%2Cfc96a%2A72CjDDDXKKmOZmmLpCezL6o1ktc7qzBf3t2eVjvJ7YJMcCnJCU24OCOl0Tlv6RSQA-QBYSVkdLWEdlYnVwUnRHb3RtNWxQZHAyZU5TZEM1b0pMdExCWmlyT1NmQURtSlc3LVF5d3ozSGJqMEtPTHZnWFp5cnF1RGRadnBOaFV0aDU3bktuUnhLdElnIIEC; bili_jct=6addd454908a44fa67bc7498c091d4ad; sid=8a0pf2bi; CURRENT_FNVAL=4048; b_lsid=ECE922B5_197D5C61D17; bp_t_offset_13560880=1085785702571966464"; // 用户cookie
  userId = 0; // 用户ID
  buvid3 = ""; // buvid3标识
  buvid4 = ""; // buvid4标识

  // 默认UserAgent
  static kDefaultUserAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
  // 默认Referer
  static kDefaultReferer = "https://live.bilibili.com/";

  // WBI签名相关静态变量
  static kImgKey = '';
  static kSubKey = '';
  // mixinKey算法的映射表
  static mixinKeyEncTab = [
    46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52
  ];

  // 获取请求头，自动补全buvid3/4
  async getHeader() {
    if (!this.buvid3) {
      const buvidInfo = await this.getBuvid();
      this.buvid3 = buvidInfo.b_3 || "";
      this.buvid4 = buvidInfo.b_4 || "";
    }
    return this.cookie === ""
      ? {
          "user-agent": BilibiliSite.kDefaultUserAgent,
          "referer": BilibiliSite.kDefaultReferer,
          "cookie": `buvid3=${this.buvid3};buvid4=${this.buvid4};`,
        }
      : {
          "cookie": this.cookie.includes("buvid3")
            ? this.cookie
            : `${this.cookie};buvid3=${this.buvid3};buvid4=${this.buvid4};`,
          "user-agent": BilibiliSite.kDefaultUserAgent,
          "referer": BilibiliSite.kDefaultReferer,
        };
  }

  // 获取直播分区及子分区
  async getCategories(): Promise<LiveCategory[]> {
    const resp = await axios.get("https://api.live.bilibili.com/room/v1/Area/getList", {
      params: { need_entrance: 1, parent_id: 0 },
      headers: await this.getHeader(),
    });
    const result = resp.data;
    const categories: LiveCategory[] = [];
    for (const item of result.data) {
      const subs: LiveSubCategory[] = [];
      for (const subItem of item.list) {
        subs.push({
          id: subItem.id.toString(),
          name: asT(subItem.name, ""),
          parentId: asT(subItem.parent_id, ""),
          pic: `${asT(subItem.pic, "")}@100w.png`,
        });
      }
      categories.push({
        children: subs,
        id: item.id.toString(),
        name: asT(item.name, ""),
      });
    }
    return categories;
  }

  // 获取某分区下的直播间列表，带WBI签名
  async getCategoryRooms(category: LiveSubCategory, page = 1): Promise<LiveCategoryResult> {
    try {
      const wbiWebid = await this.getWbiWebid();
      const baseUrl = "https://api.live.bilibili.com/xlive/web-interface/v1/second/getList";
      const url = `${baseUrl}?platform=web&parent_area_id=${category.parentId}&area_id=${category.id}&sort_type=&page=${page}&w_webid=${wbiWebid}`;
      const queryParams = await this.getWbiSign(url);
      const resp = await axios.get(baseUrl, {
        params: queryParams,
        headers: await this.getHeader(),
      });
      const result = resp.data;
      const hasMore = result?.data?.has_more === 1;
      const items = [];
      for (const item of result?.data?.list || []) {
        items.push({
          roomId: item.roomid.toString(),
          title: item.title.toString(),
          cover: `${item.cover}@400w.jpg`,
          userName: item.uname.toString(),
          online: parseInt(item.online) || 0,
        });
      }
      return { hasMore, items };
    } catch (error) {
      console.error('error', error);
      return { hasMore: false, items: [] };
    } 
  }

  // 获取直播间支持的清晰度列表
  async getPlayQualities(detail: LiveRoomDetail): Promise<LivePlayQuality[]> {
    const resp = await axios.get("https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo", {
      params: {
        room_id: detail.roomId,
        protocol: "0,1",
        format: "0,1,2",
        codec: "0,1",
        platform: "web",
      },
      headers: await this.getHeader(),
    });
    const result = resp.data;
    const qualitiesMap: { [key: number]: string } = {};
    // g_qn_desc为清晰度描述列表，构建映射表
    for (const item of result.data.playurl_info.playurl.g_qn_desc) {
      qualitiesMap[parseInt(item.qn)] = item.desc.toString();
    }
    const qualities: LivePlayQuality[] = [];
    // accept_qn为支持的清晰度编号
    for (const item of result.data.playurl_info.playurl.stream[0].format[0].codec[0].accept_qn) {
      qualities.push({
        quality: qualitiesMap[item] || "未知清晰度",
        data: item,
      });
    }
    return qualities;
  }

  // 获取直播间播放流地址列表
  async getPlayUrls(detail: LiveRoomDetail, quality: LivePlayQuality): Promise<LivePlayUrl> {
    const resp = await axios.get("https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo", {
      params: {
        room_id: detail.roomId,
        protocol: "0,1",
        format: "0,2",
        codec: "0",
        platform: "web",
        qn: quality.data,
      },
      headers: await this.getHeader(),
    });
    const result = resp.data;
    const streamList = result.data.playurl_info.playurl.stream;
    const urls: string[] = [];
    // 多层嵌套，遍历所有流、格式、编码，拼接完整播放地址
    for (const streamItem of streamList) {
      for (const formatItem of streamItem.format) {
        for (const codecItem of formatItem.codec) {
          const baseUrl = codecItem.base_url.toString();
          for (const urlItem of codecItem.url_info) {
            urls.push(`${urlItem.host}${baseUrl}${urlItem.extra}`);
          }
        }
      }
    }
    // 优先非mcdn线路
    urls.sort((a, b) => (a.includes("mcdn") ? 1 : -1));
    return {
      urls,
      headers: {
        referer: "https://live.bilibili.com",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188"
      }
    };
  }

  // 获取推荐直播间列表
  async getRecommendRooms(page = 1): Promise<LiveCategoryResult> {
    try {
    const baseUrl = "https://api.live.bilibili.com/xlive/web-interface/v1/second/getListByArea";
    const url = `${baseUrl}?platform=web&sort=online&page_size=30&page=${page}`;
    const queryParams = await this.getWbiSign(url);
    const resp = await axios.get(baseUrl, {
      params: queryParams,
      headers: await this.getHeader(),
    });
    const result = resp.data;
      
      // 添加数据验证
      if (!result || !result.data || !result.data.list) {
        console.warn('Bilibili API returned invalid data:', result);
        return { hasMore: false, items: [] };
      }
      
    const hasMore = result.data.list.length > 0;
    const items = [];
    for (const item of result.data.list) {
        if (!item) continue;
      items.push({
          roomId: item.roomid?.toString() || '',
          title: item.title?.toString() || '',
          cover: item.cover ? `${item.cover}@400w.jpg` : '',
          userName: item.uname?.toString() || '',
        online: parseInt(item.online) || 0,
      });
    }
    return { hasMore, items };
    } catch (error) {
      console.error('Bilibili getRecommendRooms error:', error);
      return { hasMore: false, items: [] };
    }
  }

  // 获取直播间详细信息，包括弹幕服务器、主播信息等
  async getRoomDetail(roomId: string): Promise<LiveRoomDetail> {
    const roomInfo = await this.getRoomInfo(roomId);
    const realRoomId = roomInfo.room_info.room_id.toString();

    const danmuInfoBaseUrl = "https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo";
    const danmuInfoUrl = `${danmuInfoBaseUrl}?id=${realRoomId}`;
    const queryParams = await this.getWbiSign(danmuInfoUrl);
    const roomDanmakuResp = await axios.get(danmuInfoBaseUrl, {
      params: queryParams,
      headers: await this.getHeader(),
    });
    const roomDanmakuResult = roomDanmakuResp.data;
    // 获取弹幕服务器host列表
    const serverHosts = (roomDanmakuResult.data.host_list || []).map((e: any) => e.host.toString());

    // 提取开播时间
    const liveStartTime = roomInfo.room_info?.live_start_time?.toString();

    return {
      roomId: realRoomId,
      title: roomInfo.room_info.title.toString(),
      cover: roomInfo.room_info.cover.toString(),
      userName: roomInfo.anchor_info.base_info.uname.toString(),
      userAvatar: `${roomInfo.anchor_info.base_info.face}@100w.jpg`,
      online: asT(roomInfo.room_info.online, 0),
      status: asT(roomInfo.room_info.live_status, 0) === 1, // 1为直播中
      url: `https://live.bilibili.com/${roomId}`,
      introduction: roomInfo.room_info.description.toString(),
      notice: "",
      danmakuData: {
        roomId: parseInt(realRoomId) || 0,
        uid: this.userId,
        token: roomDanmakuResult.data.token.toString(),
        serverHost: serverHosts.length > 0 ? serverHosts[0] : "broadcastlv.chat.bilibili.com",
        buvid: this.buvid3,
        cookie: this.cookie,
      },
      showTime: liveStartTime && liveStartTime !== '0' ? liveStartTime : undefined,
    };
  }

  // 获取直播间基础信息（room_id、主播等）
  async getRoomInfo(roomId: string) {
    const url = `https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${roomId}`;
    const queryParams = await this.getWbiSign(url);
    const resp = await axios.get("https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom", {
      params: queryParams,
      headers: await this.getHeader(),
    });
    return resp.data.data;
  }

  // 直播间搜索
  async searchRooms(keyword: string, page = 1): Promise<LiveSearchRoomResult> {
    const resp = await axios.get("https://api.bilibili.com/x/web-interface/search/type?context=&search_type=live&cover_type=user_cover", {
      params: {
        order: "",
        keyword,
        category_id: "",
        __refresh__: "",
        _extra: "",
        highlight: 0,
        single_column: 0,
        page
      },
      headers: await this.getHeader(),
    });
    const result = resp.data;
    const items = [];
    for (const item of result.data.result.live_room || []) {
      let title = item.title.toString();
      // 去除高亮标签
      title = title.replace(/<.*?em.*?>/g, "");
      items.push({
        roomId: item.roomid.toString(),
        title,
        cover: `https:${item.cover}@400w.jpg`,
        userName: item.uname.toString(),
        online: parseInt(item.online) || 0,
      });
    }
    return { hasMore: items.length >= 40, items };
  }

  // 主播搜索
  async searchAnchors(keyword: string, page = 1): Promise<LiveSearchAnchorResult> {
    const resp = await axios.get("https://api.bilibili.com/x/web-interface/search/type?context=&search_type=live_user&cover_type=user_cover", {
      params: {
        order: "",
        keyword,
        category_id: "",
        __refresh__: "",
        _extra: "",
        highlight: 0,
        single_column: 0,
        page
      },
      headers: await this.getHeader(),
    });
    const result = resp.data;
    const items = [];
    for (const item of result.data.result || []) {
      let uname = item.uname.toString();
      uname = uname.replace(/<.*?em.*?>/g, "");
      items.push({
        roomId: item.roomid.toString(),
        avatar: `https:${item.uface}@400w.jpg`,
        userName: uname,
        liveStatus: item.is_live,
      });
    }
    return { hasMore: items.length >= 40, items };
  }

  // 查询直播间是否正在直播
  async getLiveStatus(roomId: string): Promise<boolean> {
    const resp = await axios.get("https://api.live.bilibili.com/room/v1/Room/get_info", {
      params: { room_id: roomId },
      headers: await this.getHeader(),
    });
    const result = resp.data;
    return asT(result.data.live_status, 0) === 1; 
  }

  // 获取直播间SuperChat留言
  async getSuperChatMessage(roomId: string): Promise<LiveSuperChatMessage[]> {
    const resp = await axios.get("https://api.live.bilibili.com/av/v1/SuperChat/getMessageList", {
      params: { room_id: roomId },
      headers: await this.getHeader(),
    });
    const result = resp.data;
    const ls: LiveSuperChatMessage[] = [];
    for (const item of result.data?.list || []) {
      ls.push({
        backgroundBottomColor: item.background_bottom_color.toString(),
        backgroundColor: item.background_color.toString(),
        endTime: new Date(item.end_time * 1000),
        face: `${item.user_info.face}@200w.jpg`,
        message: item.message.toString(),
        price: item.price,
        startTime: new Date(item.start_time * 1000),
        userName: item.user_info.uname.toString(),
      });
    }
    return ls;
  }

  // 获取buvid3/4，优先从cookie读取，否则请求接口
  async getBuvid() {
    try {
      if (this.cookie.includes("buvid3")) {
        return {
          b_3: /buvid3=(.*?);/.exec(this.cookie)?.[1] || "",
          b_4: /buvid4=(.*?);/.exec(this.cookie)?.[1] || "",
        };
      }
      const resp = await axios.get("https://api.bilibili.com/x/frontend/finger/spi", {
        headers: {
          "user-agent": BilibiliSite.kDefaultUserAgent,
          "referer": BilibiliSite.kDefaultReferer,
          "cookie": this.cookie,
        },
      });
      return resp.data.data;
    } catch (e) {
      return { b_3: "", b_4: "" };
    }
  }

  // mixinKey算法，WBI签名专用
  getMixinKey(orig: string): string {
    return BilibiliSite.mixinKeyEncTab
      .map((n) => orig[n])
      .join("")
      .slice(0, 32);
  }

  // 获取WBI签名所需的img_key和sub_key，静态缓存
  async getWbiKeys() {
    if (BilibiliSite.kImgKey && BilibiliSite.kSubKey) {
      return { img_key: BilibiliSite.kImgKey, sub_key: BilibiliSite.kSubKey };
    }
    try {
      const resp = await axios.get('https://api.bilibili.com/x/web-interface/nav', {
        headers: await this.getHeader(),
      });
      const imgUrl = resp.data.data.wbi_img.img_url.toString();
      const subUrl = resp.data.data.wbi_img.sub_url.toString();
      
      // 截取文件名部分作为key
      const img_key = imgUrl.substring(imgUrl.lastIndexOf('/') + 1, imgUrl.lastIndexOf('.'));
      const sub_key = subUrl.substring(subUrl.lastIndexOf('/') + 1, subUrl.lastIndexOf('.'));
      BilibiliSite.kImgKey = img_key;
      BilibiliSite.kSubKey = sub_key;
      return { img_key, sub_key };
    } catch (error) {
      console.error('获取WBI keys失败:', error);
      // 如果获取失败，使用默认值
      return { img_key: 'a1b2c3d4', sub_key: 'e5f6g7h8' };
    }
  }

  // WBI签名算法，对参数进行排序、过滤、拼接、md5加密
  encWbi(
    params: { [key: string]: string | number | object | undefined },
    img_key: string,
    sub_key: string
  ) {
    const mixin_key = this.getMixinKey(img_key + sub_key),
      curr_time = Math.round(Date.now() / 1000),
      chr_filter = /[!'()*]/g;

    Object.assign(params, { wts: `${curr_time}` });
    const query = Object.keys(params)
      .sort()
      .map((key) => {
        const value = params[key]?.toString().replace(chr_filter, "") || "";
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      })
      .join("&");

    const wbi_sign = md5(query + mixin_key);
    return { ...params, w_rid: wbi_sign };
  }
  
  // 获取wbiWebid标识
  async getWbiWebid() {
    const resp = await axios.get("https://live.bilibili.com/p/eden/area-tags", {
      headers: await this.getHeader(),
    });
    const htmlContent = resp.data;
    
    // 使用正则表达式提取access_id
    const accessIdMatch = htmlContent.match(/"access_id":"([^"]+)"/);
    if (accessIdMatch && accessIdMatch[1]) {
      return accessIdMatch[1];
    }
    
    // 如果没有找到access_id，返回空字符串或默认值
    return "";
  }

  // 生成带WBI签名的参数对象
  async getWbiSign(url: string) {
    const urlObj = urlParser(url, true);
    try {
      const { img_key, sub_key } = await this.getWbiKeys();
      return this.encWbi(urlObj.query, img_key, sub_key);
    } catch (error) {
      console.error('WBI签名生成失败:', error);
      // 如果签名失败，返回原始参数
      return urlObj.query;
    }
  }
} 