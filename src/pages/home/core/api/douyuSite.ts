import axios from 'axios';
import { asT } from '../common/convertHelper';
import { Alert } from 'react-native';

export class DouyuSite {
  id = "douyu";
  name = "斗鱼直播";

  async getCategories() {
    const resp = await axios.get("https://m.douyu.com/api/cate/list");
    const result = resp.data;
    const categories = [];
    const subCateList = result.data.cate2Info as Array<any>;
    for (const item of result.data.cate1Info) {
      const cate1Id = item.cate1Id;
      const cate1Name = item.cate1Name;
      const subCategories = [];
      for (const element of subCateList.filter(x => x.cate1Id === cate1Id)) {
        subCategories.push({
          pic: element.icon,
          id: element.cate2Id.toString(),
          parentId: cate1Id.toString(),
          name: element.cate2Name.toString(),
        });
      }
      categories.push({
        id: cate1Id.toString(),
        name: cate1Name.toString(),
        children: subCategories,
      });
    }
    categories.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    return categories;
  }

  async getCategoryRooms(category: any, page = 1) {
    const resp = await axios.get(`https://www.douyu.com/gapi/rkc/directory/mixList/2_${category.id}/${page}`);
    const result = resp.data;
    const items = [];
    for (const item of result.data.rl) {
      if (item.type !== 1) continue;
      items.push({
        cover: item.rs16.toString(),
        online: item.ol,
        roomId: item.rid.toString(),
        title: item.rn.toString(),
        userName: item.nn.toString(),
      });
    }
    const hasMore = page < result.data.pgcnt;
    return { hasMore, items };
  }

  async getPlayQualities(detail: any) {
    let data = detail.data.toString();
    data += `&cdn=&rate=-1&ver=Douyu_225063005&iar=1&ive=1&hevc=0&fa=0`;
    
    // 将查询参数字符串转换为JSON对象
    const dataObj: Record<string, string> = {};
    const params = data.split('&');
    for (const param of params) {
      const [key, value] = param.split('=');
      if (key && value !== undefined) {
        dataObj[key] = value;
      }
    }
    
    console.log('转换后的JSON数据:', JSON.stringify(dataObj, null, 2));
    const resp = await axios.post(
      `https://www.douyu.com/lapi/live/getH5Play/${detail.roomId}`,
      dataObj,
      {
        headers: { 
          'referer': `https://www.douyu.com/${detail.roomId}/`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'user-agent':
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.43"
        },
      }
    );
    const result = resp.data;
    const cdns = [];
    for (const item of result.data.cdnsWithName) {
      cdns.push(item.cdn.toString());
    }
    cdns.sort((a, b) => {
      if (a.startsWith("scdn") && !b.startsWith("scdn")) return 1;
      if (!a.startsWith("scdn") && b.startsWith("scdn")) return -1;
      return 0;
    });
    const qualities = [];
    for (const item of result.data.multirates) {
      qualities.push({
        quality: item.name.toString(),
        data: { rate: item.rate, cdns },
      });
    }
    return qualities;
  }

  async getPlayUrls(detail: any, quality: any) {
    const args = detail.data.toString();
    const data = quality.data;
    const urls = [];
    for (const item of data.cdns) {
      const url = await this.getPlayUrl(detail.roomId, args, data.rate, item);
      if (url) urls.push(url);
    }
    console.error('urls', urls);
    return { urls };
  }

  async getPlayUrl(roomId, args, rate, cdn) {
    const data = `${args}&cdn=${cdn}&rate=${rate}`;
    const resp = await axios.post(
      `https://www.douyu.com/lapi/live/getH5Play/${roomId}`,
      data,
      {
        headers: {
          'referer': `https://www.douyu.com/${roomId}`,
          'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.43",
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    const result = resp.data;
    if (!result.data) return "";
    return `${result.data.rtmp_url}/${result.data.rtmp_live.toString()}`;
  }

  async getRecommendRooms(page = 1) {
    try {
    const resp = await axios.get(`https://www.douyu.com/japi/weblist/apinc/allpage/6/${page}`);
    const result = resp.data;
      
      if (!result || !result.data || !result.data.rl) {
        console.warn('Douyu API returned invalid data:', result);
        return { hasMore: false, items: [] };
      }
      
    const items = [];
    for (const item of result.data.rl) {
        if (!item || item.type !== 1) continue;
      items.push({
          cover: item.rs16?.toString() || '',
          online: item.ol || 0,
          roomId: item.rid?.toString() || '',
          title: item.rn?.toString() || '',
          userName: item.nn?.toString() || '',
      });
    }
      const hasMore = page < (result.data.pgcnt || 0);
    return { hasMore, items };
    } catch (error) {
      console.error('Douyu getRecommendRooms error:', error);
      return { hasMore: false, items: [] };
    }
  }

  async getRoomDetail(roomId) {
    const roomInfo = await this._getRoomInfo(roomId);
    const jsEncResult = await axios.get(
      `https://www.douyu.com/swf_api/homeH5Enc?rids=${roomId}`,
      {
        headers: {
          'referer': `https://www.douyu.com/${roomId}`,
          'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.43"
        }
      }
    );
    const crptext = jsEncResult.data.data[`room${roomId}`].toString();
    return {
      cover: roomInfo.room_pic.toString(),
      online: parseInt(roomInfo.room_biz_all.hot.toString()) || 0,
      roomId: roomInfo.room_id.toString(),
      title: roomInfo.room_name.toString(),
      userName: roomInfo.owner_name.toString(),
      userAvatar: roomInfo.owner_avatar.toString(),
      introduction: roomInfo.show_details.toString(),
      notice: "",
      status: roomInfo.show_status === 1 && roomInfo.videoLoop !== 1,
      danmakuData: roomInfo.room_id.toString(),
      data: await this.getPlayArgs(crptext, roomInfo.room_id.toString()),
      url: `https://www.douyu.com/${roomId}`,
      isRecord: roomInfo.videoLoop === 1,
    };
  }

  async _getRoomInfo(roomId) {
    const resp = await axios.get(`https://www.douyu.com/betard/${roomId}`, {
      headers: {
        'referer': `https://www.douyu.com/${roomId}`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.43',
      }
    });

    const result = resp.data;
    return typeof result === "string" ? JSON.parse(result).room : result.room;
  }

  async getPlayArgs(html: string, rid: string): Promise<string> {
    
    // 取加密的js
    const regex = /(vdwdae325w_64we[\s\S]*function ub98484234[\s\S]*?)function/m;
    const match = html.match(regex);
    if (match && match[1]) {
      html = match[1];
    } else {
      html = "";
    }
    
    html = html.replace(/eval.*?;}/g, "strc;}");

    console.error('html', html);
    console.error('rid', rid);
    
    try {
      const result = await axios.post(
        "http://alive.nsapps.cn/api/AllLive/DouyuSign",
        { html, rid }
      );
      if (result.data.code === 0) {
        return result.data.data.toString();
      }
    } catch (error) {
      console.error('获取播放参数失败:', error.toString());
    }
    
    return "";
  }

  async searchRooms(keyword, page = 1) {
    const did = this.generateRandomString(32);
    const resp = await axios.get("https://www.douyu.com/japi/search/api/searchShow", {
      params: {
        kw: keyword,
        page,
        pageSize: 20,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.51',
        'referer': 'https://www.douyu.com/search/',
        'Cookie': `dy_did=${did};acf_did=${did}`
      },
    });
    const result = resp.data;
    if (result.error !== 0) throw new Error(result.msg);
    const items = [];
    for (const item of result.data.relateShow) {
      items.push({
        roomId: item.rid.toString(),
        title: item.roomName.toString(),
        cover: item.roomSrc.toString(),
        userName: item.nickName.toString(),
        online: this.parseHotNum(item.hot.toString()),
      });
    }
    const hasMore = result.data.relateShow.length > 0;
    return { hasMore, items };
  }

  async searchAnchors(keyword, page = 1) {
    const did = this.generateRandomString(32);
    const resp = await axios.get("https://www.douyu.com/japi/search/api/searchUser", {
      params: {
        kw: keyword,
        page,
        pageSize: 20,
        filterType: 1,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.51',
        'referer': 'https://www.douyu.com/search/',
        'Cookie': `dy_did=${did};acf_did=${did}`
      },
    });
    const result = resp.data;
    const items = [];
    for (const item of result.data.relateUser) {
      const liveStatus = (parseInt(item.anchorInfo.isLive.toString()) || 0) === 1;
      const roomType = (parseInt(item.anchorInfo.roomType.toString()) || 0);
      items.push({
        roomId: item.anchorInfo.rid.toString(),
        avatar: item.anchorInfo.avatar.toString(),
        userName: item.anchorInfo.nickName.toString(),
        liveStatus: liveStatus && roomType === 0,
      });
    }
    const hasMore = result.data.relateUser.length > 0;
    return { hasMore, items };
  }

  async getLiveStatus(roomId) {
    const roomInfo = await this._getRoomInfo(roomId);
    return roomInfo.show_status === 1 && roomInfo.videoLoop !== 1;
  }

  generateRandomString(length) {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result;
  }

  parseHotNum(hn) {
    try {
      let num = parseFloat(hn.replace("万", ""));
      if (hn.includes("万")) num *= 10000;
      return Math.round(num);
    } catch {
      return -999;
    }
  }

  async getSuperChatMessage(roomId) {
    // 尚不支持
    return [];
  }
} 