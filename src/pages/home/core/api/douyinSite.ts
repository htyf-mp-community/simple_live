import axios from 'axios';
import jssdk from '@htyf-mp/js-sdk'
import { asT } from '../common/convertHelper';
import { Alert } from 'react-native';

const kDefaultUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0";
const kDefaultReferer = "https://live.douyin.com";
const kDefaultAuthority = "live.douyin.com";

let headers: Record<string, string> = {
  "Authority": kDefaultAuthority,
  "Referer": kDefaultReferer,
  "User-Agent": kDefaultUserAgent,
};
let kDefaultCookie = {
  expires: 0,
  value: '',
}

export class DouyinSite {
  id = "douyin";
  name = "抖音直播";

  // 签名函数（用于弹幕连接）
  private getSignatureFunction: ((roomId: string, uniqueId: string) => Promise<string>) | null = null;

  /**
   * 设置签名函数（用于抖音弹幕连接）
   * @param func 签名函数，接收 roomId 和 uniqueId，返回签名字符串
   */
  setSignatureFunction(func: (roomId: string, uniqueId: string) => Promise<string>): void {
    this.getSignatureFunction = func;
  }

  /**
   * 获取签名（用于抖音弹幕连接）
   * @param roomId 房间ID
   * @param uniqueId 用户唯一ID
   * @returns 签名字符串
   */
  async getSignature(roomId: string, uniqueId: string): Promise<string> {
    if (this.getSignatureFunction) {
      return await this.getSignatureFunction(roomId, uniqueId);
    }
    // 如果没有设置签名函数，返回空字符串（与 Flutter 的默认行为一致）
    console.warn('DouyinSite.getSignature: 未设置签名函数，返回空字符串');
    return "";
  }

  static async getDouyinDefaultCookie() {
    if (kDefaultCookie.expires > Date.now()) {
      return kDefaultCookie.value;
    }
    try {
    const resp = await jssdk.puppeteer({
      url: 'https://live.douyin.com/categorynew/1024BBA',
      jscode: `function(callback) {
        const cookie = document.cookie;
          callback(undefined, cookie);
      }`,
      wait: 0,
    });
      const cookie = resp?.cookie || resp || '';
    kDefaultCookie = {
      expires: Date.now() + 1000 * 60 * 60 * 3,
        value: cookie,
    };
      return cookie;
    } catch (error) {
      console.warn('getDouyinDefaultCookie failed:', error);
      return '';
    }
  }

  async getRequestHeaders() {
    try {
      const cookie = await DouyinSite.getDouyinDefaultCookie();
      if (cookie) {
        headers.cookie = cookie;
      }
      
      // 如果还没有 cookie，尝试从 HEAD 请求获取
      if (!headers.cookie) {
      const resp = await axios.head("https://live.douyin.com", { headers });
      const setCookie = resp.headers['set-cookie'];
        if (setCookie && Array.isArray(setCookie)) {
          for (const cookieStr of setCookie) {
            const cookie = cookieStr.split(";")[0];
        if (cookie.includes("ttwid")) {
          headers.cookie = cookie;
              break;
            }
          }
        }
      }
      return headers;
    } catch (error) {
      console.error('getRequestHeaders error:', error);
      return headers;
    }
  }

  async getCategories() {
    try {
      await DouyinSite.getDouyinDefaultCookie();
      const resp = await axios.get("https://live.douyin.com/");
      const text = resp.data;
      const match = text.match(/\{\\"pathname\\":\\"\/\\",\\"categoryData.*?\]\\n/);
      if (!match) return [];
      const renderData = match[0]
        .trim()
        .replace(/\\"/g, '"')
        .replace(/\\+/g, "\\")
        .replace(/]\\n$/, "");
      const renderDataJson = JSON.parse(renderData);
      console.error('renderDataJson', renderDataJson);
      // 组装 categories
      function flatCategories(list: any[], parentId: string | null = null): Array<{id: string, name: string, parentId: string | null, raw: any}> {
        const result: Array<{id: string, name: string, parentId: string | null, raw: any}> = [];
        for (const item of list) {
          const partition = item.partition;
          const id = partition.id_str + ',' + partition.type;
          result.push({
            id,
            name: partition.title,
            parentId,
            raw: partition,
          });
          if (item.sub_partition && item.sub_partition.length > 0) {
            result.push(...flatCategories(item.sub_partition, id));
          }
        }
        return result;
      }
      const categories = flatCategories(renderDataJson.categoryData || renderDataJson);
      return categories;
    } catch (error) {
      console.error('error', error);
      return [];
    }
  }

  async getCategoryRooms(category, page = 1) {
    try {
      const ids = category.id.split(',');
      const partitionId = ids[0];
      const partitionType = ids[1];
      
      const serverUrl = "https://live.douyin.com/webcast/web/partition/detail/room/v2/";
      const params = new URLSearchParams({
        aid: '6383',
        app_name: 'douyin_web',
        live_id: '1',
        device_platform: 'web',
        language: 'zh-CN',
        enter_from: 'link_share',
        cookie_enabled: 'true',
        screen_width: '1980',
        screen_height: '1080',
        browser_language: 'zh-CN',
        browser_platform: 'Win32',
        browser_name: 'Edge',
        browser_version: '125.0.0.0',
        browser_online: 'true',
        count: '15',
        offset: ((page - 1) * 15).toString(),
          partition: partitionId,
          partition_type: partitionType,
        req_from: '2'
      });
      
      const uri = `${serverUrl}?${params.toString()}`;
      const requestUrl = await this.getAbogusUrl(uri);
      
      // 检查 URL 是否被签名（应该包含 a_bogus 参数）
      const isSigned = requestUrl.includes('a_bogus') || requestUrl.includes('msToken');
      console.log('Douyin category request URL:', isSigned ? 'SIGNED' : 'UNSIGNED', requestUrl.substring(0, 100) + '...');
      
      const resp = await axios.get(requestUrl, {
        headers: await this.getRequestHeaders(),
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });
      
      if (resp.status === 404) {
        console.error('Douyin API returned 404, URL:', requestUrl);
        console.error('Response data:', resp.data);
        // 如果 abogus URL 返回 404，尝试使用原始 URL（可能会失败，但至少尝试）
        if (requestUrl !== uri) {
          console.log('Retrying with original URL:', uri);
          try {
            const retryResp = await axios.get(uri, {
              headers: await this.getRequestHeaders(),
              timeout: 30000,
            });
            if (retryResp.status === 200) {
              return this._parseRoomListResponse(retryResp.data);
            }
          } catch (retryError: any) {
            console.error('Retry with original URL also failed:', retryError?.message || retryError);
          }
        }
        // 如果都失败了，返回空数据而不是抛出错误
        console.warn('Douyin API 404, returning empty result');
        return { hasMore: false, items: [] };
      }
      
      return this._parseRoomListResponse(resp.data);
    } catch (error: any) {
      console.error('Douyin getCategoryRooms error:', error?.message || error);
      if (error?.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return { hasMore: false, items: [] };
    }
  }

  async getRecommendRooms(page = 1) {
    try {
      const serverUrl = "https://live.douyin.com/webcast/web/partition/detail/room/v2/";
      const params = new URLSearchParams({
        aid: '6383',
        app_name: 'douyin_web',
        live_id: '1',
        device_platform: 'web',
        language: 'zh-CN',
        enter_from: 'link_share',
        cookie_enabled: 'true',
        screen_width: '1980',
        screen_height: '1080',
        browser_language: 'zh-CN',
        browser_platform: 'Win32',
        browser_name: 'Edge',
        browser_version: '125.0.0.0',
        browser_online: 'true',
        count: '15',
        offset: ((page - 1) * 15).toString(),
        partition: '720',
        partition_type: '1',
        req_from: '2'
      });
      
      const uri = `${serverUrl}?${params.toString()}`;
      const requestUrl = await this.getAbogusUrl(uri);
      
      // 检查 URL 是否被签名（应该包含 a_bogus 参数）
      const isSigned = requestUrl.includes('a_bogus') || requestUrl.includes('msToken');
      console.log('Douyin request URL:', isSigned ? 'SIGNED' : 'UNSIGNED', requestUrl.substring(0, 100) + '...');
      
      const resp = await axios.get(requestUrl, {
      headers: await this.getRequestHeaders(),
        timeout: 30000, // 30秒超时
        validateStatus: (status) => status < 500, // 允许 4xx 状态码，以便查看具体错误
      });
      
      if (resp.status === 404) {
        console.error('Douyin API returned 404, URL:', requestUrl);
        console.error('Response data:', resp.data);
        // 如果 abogus URL 返回 404，尝试使用原始 URL（可能会失败，但至少尝试）
        if (requestUrl !== uri) {
          console.log('Retrying with original URL:', uri);
          try {
            const retryResp = await axios.get(uri, {
              headers: await this.getRequestHeaders(),
              timeout: 30000,
            });
            if (retryResp.status === 200) {
              return this._parseRoomListResponse(retryResp.data);
            }
          } catch (retryError: any) {
            console.error('Retry with original URL also failed:', retryError?.message || retryError);
          }
        }
        // 如果都失败了，返回空数据而不是抛出错误
        console.warn('Douyin API 404, returning empty result');
        return { hasMore: false, items: [] };
      }
      
      return this._parseRoomListResponse(resp.data);
    } catch (error: any) {
      console.error('Douyin getRecommendRooms error:', error?.message || error);
      if (error?.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return { hasMore: false, items: [] };
    }
  }

  async getRoomDetail(roomId) {
    if (roomId.length <= 16) {
      return await this.getRoomDetailByWebRid(roomId);
    }
    return await this.getRoomDetailByRoomId(roomId);
  }

  async getRoomDetailByRoomId(roomId) {
    const roomData = await this._getRoomDataByRoomId(roomId);
    const webRid = roomData.data.room.owner.web_rid.toString();
    const userUniqueId = this.generateRandomNumber(12).toString();
    const room = roomData.data.room;
    const owner = room.owner;
    const status = asT(room.status, 0);
    if (status === 4) {
      return await this.getRoomDetailByWebRid(webRid);
    }
    const roomStatus = status === 2;
    const headers = await this.getRequestHeaders();
    return {
      roomId: webRid,
      title: room.title.toString(),
      cover: roomStatus ? room.cover.url_list[0].toString() : "",
      userName: owner.nickname.toString(),
      userAvatar: owner.avatar_thumb.url_list[0].toString(),
      online: roomStatus ? asT(room.room_view_stats.display_value, 0) : 0,
      status: roomStatus,
      url: `https://live.douyin.com/${webRid}`,
      introduction: owner.signature.toString(),
      notice: "",
      danmakuData: {
        webRid,
        roomId,
        userId: userUniqueId,
        cookie: headers.cookie,
      },
      data: room.stream_url,
    };
  }

  async getRoomDetailByWebRid(webRid: string) {
    try {
      return await this._getRoomDetailByWebRidApi(webRid);
    } catch (e: any) {
      console.warn('_getRoomDetailByWebRidApi failed, trying HTML method:', e?.message || e);
      // API 方法失败，回退到 HTML 解析方法
    return await this._getRoomDetailByWebRidHtml(webRid);
    }
  }

  async _getRoomDetailByWebRidApi(webRid: string) {
    try {
      const data = await this._getRoomDataByApi(webRid);
      if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
        throw new Error('房间数据格式错误或为空');
      }
      
      const roomData = data.data[0];
      const userData = data.user;
      const roomId = roomData.id_str.toString();
      const userUniqueId = this.generateRandomNumber(12).toString();
      const owner = roomData.owner;
      const roomStatus = asT(roomData.status, 0) === 2;
      const headers = await this.getRequestHeaders();
      
      return {
        roomId: webRid,
        title: roomData.title?.toString() || '',
        cover: roomStatus && roomData.cover?.url_list?.[0] ? roomData.cover.url_list[0].toString() : "",
        userName: roomStatus && owner?.nickname ? owner.nickname.toString() : (userData?.nickname?.toString() || ''),
        userAvatar: roomStatus && owner?.avatar_thumb?.url_list?.[0] 
          ? owner.avatar_thumb.url_list[0].toString() 
          : (userData?.avatar_thumb?.url_list?.[0]?.toString() || ''),
        online: roomStatus ? asT(roomData.room_view_stats?.display_value, 0) : 0,
        status: roomStatus,
        url: `https://live.douyin.com/${webRid}`,
        introduction: owner?.signature?.toString() || "",
        notice: "",
        danmakuData: {
          webRid,
          roomId,
          userId: userUniqueId,
          cookie: headers.cookie || '',
        },
        data: roomStatus && roomData.stream_url ? roomData.stream_url : {},
      };
    } catch (error: any) {
      console.error('_getRoomDetailByWebRidApi error:', error?.message || error);
      throw error; // 重新抛出错误，让调用者处理
    }
  }

  async _getRoomDetailByWebRidHtml(webRid: string) {
    try {
    const roomData = await this._getRoomDataByHtml(webRid);
      if (!roomData || !roomData.roomStore || !roomData.roomStore.roomInfo) {
        throw new Error('HTML 解析失败：房间数据格式错误');
      }
      
    const roomId = roomData.roomStore.roomInfo.room.id_str.toString();
      const userUniqueId = roomData.userStore?.odin?.user_unique_id?.toString() || this.generateRandomNumber(12).toString();
    const room = roomData.roomStore.roomInfo.room;
    const owner = room.owner;
    const anchor = roomData.roomStore.roomInfo.anchor;
    const roomStatus = asT(room.status, 0) === 2;
    const headers = await this.getRequestHeaders();
      
    return {
      roomId: webRid,
        title: room.title?.toString() || '',
        cover: roomStatus && room.cover?.url_list?.[0] ? room.cover.url_list[0].toString() : "",
        userName: roomStatus && owner?.nickname 
          ? owner.nickname.toString() 
          : (anchor?.nickname?.toString() || ''),
        userAvatar: roomStatus && owner?.avatar_thumb?.url_list?.[0]
          ? owner.avatar_thumb.url_list[0].toString()
          : (anchor?.avatar_thumb?.url_list?.[0]?.toString() || ''),
        online: roomStatus ? asT(room.room_view_stats?.display_value, 0) : 0,
      status: roomStatus,
      url: `https://live.douyin.com/${webRid}`,
      introduction: owner?.signature?.toString() || "",
      notice: "",
      danmakuData: {
        webRid,
        roomId,
        userId: userUniqueId,
          cookie: headers.cookie || '',
      },
        data: roomStatus && room.stream_url ? room.stream_url : {},
    };
    } catch (error: any) {
      console.error('_getRoomDetailByWebRidHtml error:', error?.message || error);
      throw error;
    }
  }

  async _getRoomDataByHtml(webRid: string) {
    try {
      // 先尝试使用默认 Cookie
      let dyCookie = await DouyinSite.getDouyinDefaultCookie();
      
      // 如果默认 Cookie 不可用，尝试通过 HEAD 请求获取
      if (!dyCookie) {
        dyCookie = await this._getWebCookie(webRid);
      }
      
      // 构建请求头
      const requestHeaders: Record<string, string> = {
        "Authority": kDefaultAuthority,
        "Referer": kDefaultReferer,
        "User-Agent": kDefaultUserAgent,
      };
      
      // 如果有 Cookie，添加到请求头
      if (dyCookie) {
        requestHeaders["Cookie"] = dyCookie;
      }
      
      const resp = await axios.get(`https://live.douyin.com/${webRid}`, {
        headers: requestHeaders,
        timeout: 30000,
        validateStatus: (status) => status < 500, // 允许 404 等状态码，但会抛出错误
        maxRedirects: 5,
    });
      
      // 检查响应状态
      if (resp.status === 404) {
        throw new Error(`房间 ${webRid} 不存在或已关闭`);
      }
      
      if (resp.status !== 200) {
        throw new Error(`请求失败，状态码: ${resp.status}`);
      }
      
    const result = resp.data;
      if (typeof result !== 'string') {
        throw new Error('响应数据不是字符串格式');
      }
      
      // 使用与 Flutter 相同的正则表达式
      // Flutter: r'\{\\"state\\":\{\\"appStore.*?\]\\n'
      const match = result.match(/\{\\"state\\":\{\\"appStore.*?\]\\n/);
      if (!match || !match[0]) {
        throw new Error('无法从 HTML 中提取房间数据，可能页面结构已变化');
      }
      
      // 按照 Flutter 的逻辑处理字符串
      // Flutter: replaceAll('\\"', '"') -> replaceAll(r"\\", r"\") -> replaceAll(']\\n', "")
      let str = match[0]
          .trim()
        .replace(/\\"/g, '"')      // 将 \" 替换为 "
        .replace(/\\\\/g, '\\')     // 将 \\ 替换为 \ (注意：在字符串中 \\ 表示一个反斜杠)
        .replace(/]\\n$/, '');       // 移除末尾的 ]\n
      
      // 如果字符串仍然以 ] 结尾，可能是正则匹配的问题，尝试移除
      if (str.endsWith(']')) {
        str = str.slice(0, -1);
      }
      
      // 尝试解析 JSON
      let renderDataJson;
      try {
        renderDataJson = JSON.parse(str);
      } catch (parseError: any) {
        // 如果解析失败，尝试修复常见的 JSON 格式问题
        console.warn('JSON parse failed, attempting to fix:', parseError?.message);
        console.warn('Problematic string (first 500 chars):', str.substring(0, 500));
        
        // 尝试移除末尾的不完整部分
        let fixedStr = str;
        // 如果以 ] 结尾，移除它
        if (fixedStr.endsWith(']')) {
          fixedStr = fixedStr.slice(0, -1);
        }
        // 尝试找到最后一个完整的 JSON 对象
        const lastBraceIndex = fixedStr.lastIndexOf('}');
        if (lastBraceIndex > 0) {
          fixedStr = fixedStr.substring(0, lastBraceIndex + 1);
        }
        
        try {
          renderDataJson = JSON.parse(fixedStr);
        } catch (secondError: any) {
          console.error('JSON parse failed even after fix:', secondError?.message);
          console.error('Fixed string (first 500 chars):', fixedStr.substring(0, 500));
          throw new Error(`JSON 解析失败: ${parseError?.message || parseError}`);
        }
      }
      
      if (!renderDataJson || !renderDataJson.state) {
        throw new Error('解析后的 JSON 数据格式错误：缺少 state 字段');
      }
      
    return renderDataJson.state;
    } catch (error: any) {
      // 如果是 axios 错误，提供更详细的错误信息
      if (error?.response) {
        console.error('_getRoomDataByHtml error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          url: error.config?.url,
          message: error.message,
        });
        throw new Error(`请求失败: ${error.response.status} ${error.response.statusText}`);
      }
      console.error('_getRoomDataByHtml error:', error?.message || error);
      throw error;
    }
  }

  async _getWebCookie(webRid: string): Promise<string> {
    try {
      // 先尝试使用默认 Cookie
      const defaultCookie = await DouyinSite.getDouyinDefaultCookie();
      if (defaultCookie) {
        return defaultCookie;
      }
      
      // 如果默认 Cookie 不可用，尝试通过 HEAD 请求获取
      const resp = await axios.head(`https://live.douyin.com/${webRid}`, { 
        headers,
        timeout: 10000,
        validateStatus: (status) => status < 500, // 允许 404 等状态码
        maxRedirects: 5,
      });
      
    let dyCookie = "";
    const setCookie = resp.headers['set-cookie'];
    if (setCookie) {
        // setCookie 可能是数组或字符串
        const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
        for (const cookieStr of cookieArray) {
          // 如果 cookieStr 包含多个 cookie（用逗号分隔），需要分别处理
          const cookies = cookieStr.split(',');
          for (const cookie of cookies) {
            const cookieValue = cookie.split(";")[0].trim();
            if (cookieValue.includes("ttwid")) dyCookie += `${cookieValue};`;
            if (cookieValue.includes("__ac_nonce")) dyCookie += `${cookieValue};`;
            if (cookieValue.includes("msToken")) dyCookie += `${cookieValue};`;
      }
    }
      }
      
      // 如果从 HEAD 请求获取到了 Cookie，返回它
      if (dyCookie) {
        return dyCookie;
      }
      
      // 如果都没有，返回空字符串（让请求继续尝试）
      return '';
    } catch (error: any) {
      console.warn('_getWebCookie error:', error?.message || error);
      // 即使出错也返回空字符串，让请求继续尝试
      return '';
    }
  }

  async _getRoomDataByApi(webRid: string) {
    const serverUrl = "https://live.douyin.com/webcast/room/web/enter/";
    const params = new URLSearchParams({
      aid: '6383',
      app_name: 'douyin_web',
      live_id: '1',
      device_platform: 'web',
      enter_from: 'web_live',
      web_rid: webRid,
      room_id_str: '',
      enter_source: '',
      "Room-Enter-User-Login-Ab": '0',
      is_need_double_stream: 'false',
      cookie_enabled: 'true',
      screen_width: '1980',
      screen_height: '1080',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Edge',
      browser_version: '125.0.0.0'
    });
    
    const uri = `${serverUrl}?${params.toString()}`;
    const requestUrl = await this.getAbogusUrl(uri);
    
    const requestHeader = await this.getRequestHeaders();
    const resp = await axios.get(requestUrl, {
      headers: requestHeader,
      timeout: 30000,
      validateStatus: (status) => status < 500,
    });
    
    if (resp.status === 404) {
      console.error('Douyin _getRoomDataByApi returned 404, URL:', requestUrl);
      if (requestUrl !== uri) {
        console.log('Retrying with original URL...');
        const retryResp = await axios.get(uri, {
          headers: requestHeader,
          timeout: 30000,
        });
        return retryResp.data.data;
      }
      throw new Error('抖音房间详情 API 返回 404');
    }
    
    return resp.data.data;
  }

  async _getRoomDataByRoomId(roomId) {
    const resp = await axios.get('https://webcast.amemv.com/webcast/room/reflow/info/', {
      params: {
        type_id: 0,
        live_id: 1,
        room_id: roomId,
        sec_user_id: "",
        version_code: "99.99.99",
        app_id: 6383,
      },
      headers: await this.getRequestHeaders(),
    });
    return resp.data;
  }

  async getPlayQualities(detail: any) {
    try {
      if (!detail || !detail.data || !detail.data.live_core_sdk_data) {
        throw new Error('房间详情数据格式错误');
      }

    const qulityList = detail.data.live_core_sdk_data.pull_data.options.qualities;
      if (!qulityList || !Array.isArray(qulityList)) {
        throw new Error('清晰度列表格式错误');
      }

    const streamData = detail.data.live_core_sdk_data.pull_data.stream_data.toString();
      const qualities: any[] = [];
      
    if (!streamData.startsWith('{')) {
        // 方式1: 从 flv_pull_url 和 hls_pull_url_map 获取
        const flvList = Object.values(detail.data.flv_pull_url || {});
        const hlsList = Object.values(detail.data.hls_pull_url_map || {});
        
      for (const quality of qulityList) {
        const level = quality.level;
          const urls: string[] = [];
        const flvIndex = flvList.length - level;
          if (flvIndex >= 0 && flvIndex < flvList.length) {
            urls.push(flvList[flvIndex] as string);
          }
        const hlsIndex = hlsList.length - level;
          if (hlsIndex >= 0 && hlsIndex < hlsList.length) {
            urls.push(hlsList[hlsIndex] as string);
          }
        if (urls.length > 0) {
          qualities.push({
            quality: quality.name,
            sort: level,
            data: urls,
          });
        }
      }
    } else {
        // 方式2: 从 stream_data JSON 中获取
      const qualityData = JSON.parse(streamData).data;
      for (const quality of qulityList) {
          const urls: string[] = [];
        const flvUrl = qualityData[quality.sdk_key]?.main?.flv?.toString();
          if (flvUrl && flvUrl.length > 0) {
            urls.push(flvUrl);
          }
        const hlsUrl = qualityData[quality.sdk_key]?.main?.hls?.toString();
          if (hlsUrl && hlsUrl.length > 0) {
            urls.push(hlsUrl);
          }
        if (urls.length > 0) {
          qualities.push({
            quality: quality.name,
            sort: quality.level,
            data: urls,
          });
        }
      }
    }
      
      // 按 sort 降序排序（与 Flutter 一致）
    qualities.sort((a, b) => b.sort - a.sort);
    return qualities;
    } catch (error: any) {
      console.error('getPlayQualities error:', error?.message || error);
      return [];
    }
  }

  async getPlayUrls(detail, quality) {
    return { urls: quality.data };
  }

  async searchRooms(keyword: string, page: number = 1) {
    try {
    const serverUrl = "https://www.douyin.com/aweme/v1/web/live/search/";
      const params = new URLSearchParams({
      device_platform: "webapp",
      aid: "6383",
      channel: "channel_pc_web",
      search_channel: "aweme_live",
        keyword: keyword,
      search_source: "switch_tab",
      query_correct_type: "1",
      is_filter_search: "0",
      from_group_id: "",
      offset: ((page - 1) * 10).toString(),
      count: "10",
      pc_client_type: "1",
      version_code: "170400",
      version_name: "17.4.0",
      cookie_enabled: "true",
      screen_width: "1980",
      screen_height: "1080",
      browser_language: "zh-CN",
      browser_platform: "Win32",
      browser_name: "Edge",
      browser_version: "125.0.0.0",
      browser_online: "true",
      engine_name: "Blink",
      engine_version: "125.0.0.0",
      os_name: "Windows",
      os_version: "10",
      cpu_core_num: "12",
      device_memory: "8",
      platform: "PC",
      downlink: "10",
      effective_type: "4g",
      round_trip_time: "100",
      webid: "7382872326016435738",
      });
      
      // 构建完整 URL（与 Flutter 一致）
      // Flutter: var uri = Uri.parse(serverUrl).replace(...)
      const uri = `${serverUrl}?${params.toString()}`;
      
      // Flutter 中 abogus URL 被注释掉了，直接使用原始 URL
      // Flutter: //var requlestUrl = await getAbogusUrl(uri.toString());
      // Flutter: var requlestUrl = uri.toString();
      const requestUrl = uri;
      
      // 获取 Cookie（与 Flutter 完全一致的方式）
      // Flutter: var headResp = await HttpClient.instance.head('https://live.douyin.com', header: headers);
      let dyCookie = "";
      try {
        const headResp = await axios.head('https://live.douyin.com', { 
          headers,
          timeout: 10000,
          validateStatus: (status) => status < 500,
        });
        
        // Flutter: headResp.headers["set-cookie"]?.forEach((element) { ... })
        const setCookie = headResp.headers['set-cookie'];
        if (setCookie) {
          // setCookie 可能是数组或字符串（与 Flutter 的 forEach 一致）
          const cookieArray = Array.isArray(setCookie) ? setCookie : [setCookie];
          for (const cookieStr of cookieArray) {
            // Flutter: var cookie = element.split(";")[0];
            const cookie = cookieStr.split(";")[0].trim();
            // Flutter: if (cookie.contains("ttwid")) { dyCookie += "$cookie;"; }
            if (cookie.includes("ttwid")) {
              dyCookie += `${cookie};`;
            }
            // Flutter: if (cookie.contains("__ac_nonce")) { dyCookie += "$cookie;"; }
            if (cookie.includes("__ac_nonce")) {
              dyCookie += `${cookie};`;
            }
          }
        }
      } catch (cookieError: any) {
        console.warn('获取 Cookie 失败，尝试使用默认 Cookie:', cookieError?.message);
        // 如果 HEAD 请求失败，尝试使用默认 Cookie
        const defaultCookie = await DouyinSite.getDouyinDefaultCookie();
        if (defaultCookie) {
          dyCookie = defaultCookie;
        }
      }
      
      // 如果 Cookie 仍然为空，记录警告但继续尝试
      if (!dyCookie) {
        console.warn('搜索请求 Cookie 为空，可能会被拦截');
      }
      
      // 发送请求（与 Flutter 的请求头完全一致）
      // Flutter: var result = await HttpClient.instance.getJson(requlestUrl, queryParameters: {}, header: { ... });
      const resp = await axios.get(requestUrl, {
        // Flutter 中使用 queryParameters: {}，因为 URL 已经包含所有参数
      headers: {
        "Authority": 'www.douyin.com',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'cookie': dyCookie,
        'priority': 'u=1, i',
        'referer': `https://www.douyin.com/search/${encodeURIComponent(keyword)}?type=live`,
        'sec-ch-ua': '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': kDefaultUserAgent,
      },
        timeout: 30000,
        validateStatus: (status) => status < 500,
    });
      
    const result = resp.data;
      
      // 检查是否被限制（与 Flutter 一致）
    if (result === "" || result === 'blocked') {
      throw new Error("抖音直播搜索被限制，请稍后再试");
    }
      
      // 检查响应状态
      if (resp.status === 404) {
        console.error('搜索请求 404，响应数据:', result);
        throw new Error(`搜索请求返回 404，可能关键词无效或 API 已变更`);
      }
      
      if (resp.status !== 200) {
        console.error('搜索请求失败，状态码:', resp.status, '响应数据:', result);
        throw new Error(`搜索请求失败，状态码: ${resp.status}`);
      }
      
      // 检查响应数据格式
      if (!result) {
        console.error('搜索响应为空');
        throw new Error('搜索响应数据为空');
      }
      
      // 如果返回的是错误信息
      if (result.status_code !== undefined && result.status_code !== 0) {
        console.error('搜索 API 返回错误:', result);
        throw new Error(result.status_msg || `搜索失败，错误码: ${result.status_code}`);
      }
      
      // 解析数据（与 Flutter 一致）
      const items: any[] = [];
      if (result && result.data && Array.isArray(result.data)) {
        for (const item of result.data) {
          try {
            // Flutter: json.decode(item["lives"]["rawdata"].toString())
            const rawdata = item?.lives?.rawdata;
            if (!rawdata) {
              console.warn('搜索项缺少 rawdata:', item);
              continue;
            }
            
            // 处理 rawdata：可能是字符串或对象
            let itemData: any;
            if (typeof rawdata === 'string') {
              try {
                itemData = JSON.parse(rawdata);
              } catch (parseError) {
                console.warn('rawdata JSON 解析失败:', parseError, rawdata);
                continue;
              }
            } else if (typeof rawdata === 'object') {
              // 如果已经是对象，直接使用
              itemData = rawdata;
            } else {
              // 尝试 toString 后解析（与 Flutter 一致）
              try {
                itemData = JSON.parse(String(rawdata));
              } catch (parseError) {
                console.warn('rawdata 转换失败:', parseError, rawdata);
                continue;
              }
            }
            
            // 验证必要字段
            if (!itemData || !itemData.owner || !itemData.title) {
              console.warn('搜索项数据不完整:', itemData);
              continue;
            }
            
            items.push({
              roomId: itemData?.owner?.web_rid?.toString() || '',
              title: itemData?.title?.toString() || '',
              cover: itemData?.cover?.url_list?.[0]?.toString() || '',
              userName: itemData?.owner?.nickname?.toString() || '',
              online: parseInt(itemData?.stats?.total_user?.toString() || '0') || 0,
            });
          } catch (itemError: any) {
            console.warn('解析搜索项失败:', itemError?.message, itemError);
            continue;
          }
        }
      } else {
        console.warn('搜索结果格式异常:', result);
      }
      
      return { hasMore: items.length >= 10, items };
    } catch (error: any) {
      console.error('searchRooms error:', error?.message || error);
      if (error?.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  async searchAnchors(keyword, page = 1) {
    throw new Error("抖音暂不支持搜索主播，请直接搜索直播间");
  }

  async getLiveStatus(roomId) {
    const result = await this.getRoomDetail(roomId);
    return result.status;
  }

  async getSuperChatMessage(roomId) {
    return [];
  }

  generateRandomString(length) {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 16).toString(16);
    }
    return result;
  }

  generateRandomNumber(length) {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10).toString();
    }
    return parseInt(result, 10) || Math.floor(Math.random() * 1000000000);
  }

  // 解析房间列表响应
  _parseRoomListResponse(result: any) {
    if (!result || !result.data || !Array.isArray(result.data.data)) {
      console.warn('Douyin API returned invalid data:', result);
      return { hasMore: false, items: [] };
    }
    
    const hasMore = result.data.data.length >= 15;
    const items = [];
    for (const item of result.data.data) {
      if (!item || !item.room) continue;
      items.push({
        roomId: item.web_rid || '',
        title: item.room.title?.toString() || '',
        cover: item.room.cover?.url_list?.[0]?.toString() || '',
        userName: item.room.owner?.nickname?.toString() || '',
        online: parseInt(item.room.room_view_stats?.display_value) || 0,
      });
    }
    return { hasMore, items };
  }

  // 生成 msToken（107 字符的随机字符串）
  generateMsToken(length: number = 107): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async getAbogusUrl(url: string): Promise<string> {
    try {
      // 方法1: 尝试使用本地 JavaScript 执行（与 Flutter 相同的方式）
      try {
        // 生成 msToken（107 字符，与 Flutter 相同）
        const msToken = this.generateMsToken(107);
        
        // 提取查询参数（与 Flutter 逻辑完全相同）
        // Flutter: var params = ('$url&msToken=$msToken').split('?')[1];
        // Flutter: var query = params.contains("?") ? params.split("?")[1] : params;
        let query = '';
        if (url.includes('?')) {
          const urlWithMsToken = `${url}&msToken=${msToken}`;
          const params = urlWithMsToken.split('?')[1];
          // 检查 params 中是否还包含 '?'（理论上不应该，但保持与 Flutter 一致）
          query = params.includes('?') ? params.split('?')[1] : params;
        } else {
          query = `msToken=${msToken}`;
        }
        
        // 加载并执行 a_bogus.js（React Native 中可以直接 require）
        const aBogusJs = require('./scripts/a_bogus.js');
        if (!aBogusJs || typeof aBogusJs.getABogus !== 'function') {
          throw new Error('a_bogus.js getABogus function not found');
        }
        
        const aBogus = aBogusJs.getABogus(query, kDefaultUserAgent);
        if (!aBogus || typeof aBogus !== 'string') {
          throw new Error('getABogus returned invalid result');
        }
        
        // 组合最终 URL（与 Flutter 格式相同）
        // Flutter: '$url&msToken=${Uri.encodeComponent(msToken)}&a_bogus=${Uri.encodeComponent(aBogus)}'
        const separator = url.includes('?') ? '&' : '?';
        const newUrl = `${url}${separator}msToken=${encodeURIComponent(msToken)}&a_bogus=${encodeURIComponent(aBogus)}`;
        
        console.log('Local abogus generation success');
        return newUrl;
      } catch (localError: any) {
        console.warn('Local abogus generation failed:', localError?.message || localError);
        console.warn('Falling back to remote service...');
        
        // 方法2: 回退到远程服务
    try {
      const resp = await axios.post("https://dy.nsapps.cn/abogus", {
        url,
        userAgent: kDefaultUserAgent,
      }, {
        headers: { "Content-Type": "application/json" },
            timeout: 10000,
          });
          
          if (resp.data && resp.data.data && resp.data.data.url) {
            const signedUrl = resp.data.data.url;
            if (signedUrl && signedUrl.startsWith('http')) {
              console.log('Remote abogus service success');
              return signedUrl;
            }
            console.warn('Remote service returned invalid URL format');
          } else {
            console.warn('Remote service response format unexpected:', resp.data);
          }
        } catch (remoteError: any) {
          console.warn('Remote abogus service also failed:', remoteError?.message || remoteError);
        }
        
        // 如果都失败了，返回原 URL（可能会被拦截，但至少可以尝试）
        console.warn('All abogus methods failed, using original URL (may be blocked)');
        return url;
      }
    } catch (e: any) {
      console.error('getAbogusUrl unexpected error:', e?.message || e);
      // 如果都失败了，直接返回原 URL
      return url;
    }
  }
} 

DouyinSite.getDouyinDefaultCookie();