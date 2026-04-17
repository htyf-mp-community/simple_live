import axios from 'axios';
import { asT } from '../common/convertHelper';

export class HuyaSite {
  id = "huya";
  name = "虎牙直播";
  kUserAgent = "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36 Edg/117.0.0.0";

  async getCategories() {
    const categories = [
      { id: "1", name: "网游", children: [] },
      { id: "2", name: "单机", children: [] },
      { id: "8", name: "娱乐", children: [] },
      { id: "3", name: "手游", children: [] },
    ];
    for (const item of categories) {
      const items = await this.getSubCategories(item.id);
      item.children = items;
    }
    return categories;
  }

  async getSubCategories(id) {
    const resp = await axios.get("https://live.cdn.huya.com/liveconfig/game/bussLive", {
      params: { bussType: id }
    });
    const result = resp.data;
    const subs = [];
    for (const item of result.data) {
      let gid = "";
      if (typeof item.gid === "object" && item.gid.value) {
        gid = item.gid.value.toString().split(",")[0];
      } else if (typeof item.gid === "number") {
        gid = item.gid.toString();
      } else {
        gid = item.gid.toString();
      }
      subs.push({
        id: gid,
        name: item.gameFullName.toString(),
        parentId: id,
        pic: `https://huyaimg.msstatic.com/cdnimage/game/${gid}-MS.jpg`,
      });
    }
    return subs;
  }

  async getCategoryRooms(category, page = 1) {
    const resp = await axios.get("https://www.huya.com/cache.php", {
      params: {
        m: "LiveList",
        do: "getLiveListByPage",
        tagAll: 0,
        gameId: category.id,
        page
      }
    });
    const result = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    const items = [];
    for (const item of result.data.datas) {
      let cover = item.screenshot.toString();
      if (!cover.includes("?")) cover += "?x-oss-process=style/w338_h190&";
      let title = item.introduction?.toString() || "";
      if (!title) title = item.roomName?.toString() || "";
      items.push({
        roomId: item.profileRoom.toString(),
        title,
        cover,
        userName: item.nick.toString(),
        online: parseInt(item.totalCount) || 0,
      });
    }
    const hasMore = result.data.page < result.data.totalPage;
    return { hasMore, items };
  }

  async getPlayQualities(detail) {
    const urlData = detail.data;
    if (!urlData.bitRates || urlData.bitRates.length === 0) {
      urlData.bitRates = [
        { name: "原画", bitRate: 0 },
        { name: "高清", bitRate: 2000 },
      ];
    }
    const qualities = [];
    for (const item of urlData.bitRates) {
      qualities.push({
        data: {
          urls: urlData.lines,
          bitRate: item.bitRate,
        },
        quality: item.name,
      });
    }
    return qualities;
  }

  async getPlayUrls(detail, quality) {
    const ls = [];
    for (const element of quality.data.urls) {
      console.log('element', element);
      const url = await this.getPlayUrl(element, quality.data.bitRate);
      ls.push(url);
    }
    return {
      urls: ls,
      headers: {
        "user-agent": "HYSDK(Windows, 30000002)_APP(pc_exe&6070100&official)_SDK(trans&2.21.0.4784)"
      }
    };
  }

  async getPlayUrl(line, bitRate) {
    // 这里需要调用 Tars 协议服务端，建议用后端中转
    // 你可以用 axios.post("http://wup.huya.com/liveui", {...})
    // 这里只返回拼接字符串
    let url = `${line.line?.replace('http://', 'https://')}/${line.streamName}.flv?${line.flvAntiCode}&codec=264&ver=1`;
    if (bitRate > 0) url += `&ratio=${bitRate}`;
    return url;
  }

  async getRecommendRooms(page = 1) {
    try {
    const resp = await axios.get("https://www.huya.com/cache.php", {
      params: {
        m: "LiveList",
        do: "getLiveListByPage",
        tagAll: 0,
        page
      }
    });
    const result = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
      
      if (!result || !result.data || !result.data.datas) {
        console.warn('Huya API returned invalid data:', result);
        return { hasMore: false, items: [] };
      }
      
    const items = [];
    for (const item of result.data.datas) {
        if (!item) continue;
        let cover = item.screenshot?.toString() || "";
        if (cover && !cover.includes("?")) cover += "?x-oss-process=style/w338_h190&";
      let title = item.introduction?.toString() || "";
      if (!title) title = item.roomName?.toString() || "";
      items.push({
          roomId: item.profileRoom?.toString() || '',
        title,
        cover,
          userName: item.nick?.toString() || '',
        online: parseInt(item.totalCount) || 0,
      });
    }
      const hasMore = (result.data.page || 0) < (result.data.totalPage || 0);
    return { hasMore, items };
    } catch (error) {
      console.error('Huya getRecommendRooms error:', error);
      return { hasMore: false, items: [] };
    }
  }

  async getRoomDetail(roomId) {
    const roomInfo = await this._getRoomInfo(roomId);
    const tLiveInfo = roomInfo.roomInfo.tLiveInfo;
    const tProfileInfo = roomInfo.roomInfo.tProfileInfo;
    let title = tLiveInfo.sIntroduction?.toString() || "";
    if (!title) title = tLiveInfo.sRoomName?.toString() || "";
    const huyaLines = [];
    const huyaBiterates = [];
    const lines = tLiveInfo.tLiveStreamInfo.vStreamInfo.value;
    for (const item of lines) {
      if ((item.sFlvUrl?.toString() || "").length > 0) {
        huyaLines.push({
          line: item.sFlvUrl.toString(),
          lineType: "flv",
          flvAntiCode: item.sFlvAntiCode.toString(),
          hlsAntiCode: item.sHlsAntiCode.toString(),
          streamName: item.sStreamName.toString(),
          cdnType: item.sCdnType.toString(),
        });
      }
    }
    const biterates = tLiveInfo.tLiveStreamInfo.vBitRateInfo.value;
    for (const item of biterates) {
      const name = item.sDisplayName.toString();
      if (name.includes("HDR")) continue;
      huyaBiterates.push({
        bitRate: item.iBitRate,
        name,
      });
    }
    const topSid = roomInfo.topSid;
    const subSid = roomInfo.subSid;
    return {
      cover: tLiveInfo.sScreenshot.toString(),
      online: tLiveInfo.lTotalCount,
      roomId: tLiveInfo.lProfileRoom.toString(),
      title,
      userName: tProfileInfo.sNick.toString(),
      userAvatar: tProfileInfo.sAvatar180.toString(),
      introduction: tLiveInfo.sIntroduction.toString(),
      notice: roomInfo.welcomeText.toString(),
      status: roomInfo.roomInfo.eLiveStatus === 2,
      data: {
        url: "",
        lines: huyaLines,
        bitRates: huyaBiterates,
        uid: this.getUid(13, 10),
      },
      danmakuData: {
        ayyuid: tLiveInfo.lYyid || 0,
        topSid: topSid || 0,
        subSid: subSid || 0,
      },
      url: `https://www.huya.com/${roomId}`,
    };
  }

  async _getRoomInfo(roomId) {
    const resp = await axios.get(`https://m.huya.com/${roomId}`, {
      headers: { "user-agent": this.kUserAgent }
    });
    const resultText = resp.data;
    const text = /window\.HNF_GLOBAL_INIT.=.\{[\s\S]*?\}[\s\S]*?<\/script>/.exec(resultText)?.[0];
    let jsonText = text
      ?.replace(/window\.HNF_GLOBAL_INIT.=./, '')
      .replace(/<\/script>/, "")
      .replace(/function.*?\(.*?\).\{[\s\S]*?\}/g, '""');
    const jsonObj = JSON.parse(jsonText || "{}" );
    const topSid = parseInt(/lChannelId":([0-9]+)/.exec(resultText)?.[1] || "0");
    const subSid = parseInt(/lSubChannelId":([0-9]+)/.exec(resultText)?.[1] || "0");
    jsonObj.topSid = topSid;
    jsonObj.subSid = subSid;
    return jsonObj;
  }

  async searchRooms(keyword, page = 1) {
    const resp = await axios.get("https://search.cdn.huya.com/", {
      params: {
        m: "Search",
        do: "getSearchContent",
        q: keyword,
        uid: 0,
        v: 4,
        typ: -5,
        livestate: 0,
        rows: 20,
        start: (page - 1) * 20,
      }
    });
    const result = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    const items = [];
    for (const item of result.response["3"].docs) {
      let cover = item.game_screenshot.toString();
      if (!cover.includes("?")) cover += "?x-oss-process=style/w338_h190&";
      let title = item.game_introduction?.toString() || "";
      if (!title) title = item.game_roomName?.toString() || "";
      items.push({
        roomId: item.room_id.toString(),
        title,
        cover,
        userName: item.game_nick.toString(),
        online: parseInt(item.game_total_count) || 0,
      });
    }
    const hasMore = result.response["3"].numFound > (page * 20);
    return { hasMore, items };
  }

  async searchAnchors(keyword, page = 1) {
    const resp = await axios.get("https://search.cdn.huya.com/", {
      params: {
        m: "Search",
        do: "getSearchContent",
        q: keyword,
        uid: 0,
        v: 1,
        typ: -5,
        livestate: 0,
        rows: 20,
        start: (page - 1) * 20,
      }
    });
    const result = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    const items = [];
    for (const item of result.response["1"].docs) {
      items.push({
        roomId: item.room_id.toString(),
        avatar: item.game_avatarUrl180.toString(),
        userName: item.game_nick.toString(),
        liveStatus: item.gameLiveOn,
      });
    }
    const hasMore = result.response["1"].numFound > (page * 20);
    return { hasMore, items };
  }

  async getLiveStatus(roomId) {
    const roomInfo = await this._getRoomInfo(roomId);
    return roomInfo.roomInfo.eLiveStatus === 2;
  }

  getUid(t, e) {
    const n = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("");
    const o = Array(36).fill('');
    if (t) {
      for (let i = 0; i < t; i++) {
        o[i] = n[Math.floor(Math.random() * (e || n.length))];
      }
    } else {
      o[8] = o[13] = o[18] = o[23] = "-";
      o[14] = "4";
      for (let i = 0; i < 36; i++) {
        if (!o[i]) {
          const r = Math.floor(Math.random() * 16);
          o[i] = n[19 === i ? 3 & r | 8 : r];
        }
      }
    }
    return o.join("");
  }

  async getSuperChatMessage(roomId) {
    // 尚不支持
    return [];
  }
} 