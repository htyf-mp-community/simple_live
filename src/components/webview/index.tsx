import { useState, forwardRef, ForwardedRef, useCallback } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import WebView, { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import jssdk from '@htyf-mp/js-sdk';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * 默认的 User-Agent 字符串
 * 使用 iOS Safari 的 UA 来确保最佳的网页兼容性
 */
const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1"

/**
 * WebviewCore 组件
 * 
 * 一个封装了常用功能的 WebView 组件，包括：
 * - 加载状态显示
 * - 错误处理和重试机制
 * - 性能优化配置
 * - 通用的 WebView 设置
 * 
 * @param props.url - 需要加载的 URL
 * @param props.injectedJavaScript - 注入到网页的 JavaScript 代码
 * @param props.onMessage - WebView 消息处理函数
 */
const WebviewCore = forwardRef((
  props: {
    url: string,
    injectedJavaScript?: string,
    onMessage?: (data: WebViewMessageEvent) => void,
    onShouldStartLoadWithRequest?: (event: WebViewNavigation) => boolean,
  },
  ref: ForwardedRef<WebView>
) => {
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /**
   * 处理 WebView 重新加载
   * 重置错误状态并触发重新加载
   */
  const handleReload = useCallback(() => {
    setError(false);
    setLoading(true);
    if (ref && typeof ref !== 'function') {
      ref.current?.reload();
    }
  }, [ref]);

  /**
   * 处理 WebView 消息
   * 使用 useCallback 优化性能
   */
  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    props.onMessage?.(e);
  }, [props.onMessage]);

  /**
   * 处理加载开始事件
   */
  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(false);
  }, []);

  /**
   * 处理加载结束事件
   */
  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  /**
   * 处理错误事件
   */
  const handleError = useCallback((e: any) => {
    setLoading(false);
    setError(true);
    jssdk.showToast({
      title: '加载失败',
      description: e.nativeEvent.description,
      type: 'error',
    });
  }, []);

  return (
    <View style={{ flex: 1, flexGrow: 2, backgroundColor: '#F8F8F8' }}>
      {/* 加载状态指示器 */}
      {loading && !error && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0, top: 0, right: 0, bottom: 0,
            zIndex: 10,
            backgroundColor: 'rgba(0,0,0,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 12,
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ marginTop: 16, color: '#fff', fontSize: 16, fontWeight: '500' }}>正在加载…</Text>
        </View>
      )}

      {/* 错误状态显示 */}
      {error && (
        <View style={{
          position: 'absolute',
          left: 0, top: 0, right: 0, bottom: 0,
          zIndex: 15,
          backgroundColor: 'rgba(0,0,0,0.95)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }}>
          <Svg width={48} height={48} viewBox="0 0 48 48">
            <Circle
              cx="24"
              cy="24"
              r="20"
              stroke="#FF3B30"
              strokeWidth="4"
              fill="none"
            />
            <Path
              d="M24 14v12"
              stroke="#FF3B30"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <Circle
              cx="24"
              cy="34"
              r="2"
              fill="#FF3B30"
            />
          </Svg>
          <Text style={{ marginTop: 16, color: '#FF3B30', fontSize: 16, fontWeight: '500' }}>加载失败</Text>
          <TouchableOpacity
            onPress={handleReload}
            style={{
              marginTop: 20,
              backgroundColor: '#007AFF',
              borderRadius: 12,
              paddingHorizontal: 32,
              paddingVertical: 10,
              shadowColor: '#007AFF',
              shadowOpacity: 0.15,
              shadowRadius: 8,
            }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>重试</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* WebView 核心组件 */}
      <WebView
        // 媒体播放相关配置
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={true}
        allowsAirPlayForMediaPlayback
        allowsFullscreenVideo

        // 注入的 JavaScript 代码
        injectedJavaScript={props.injectedJavaScript}

        // 性能优化配置
        androidLayerType="hardware"
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        javaScriptEnabled={true}
        thirdPartyCookiesEnabled={true}

        // 权限和安全配置
        mediaCapturePermissionGrantType="grant"
        userAgent={userAgent}
        allowsBackForwardNavigationGestures={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}

        // 引用和样式
        ref={ref}
        style={{ flexGrow: 2 }}

        // 源地址和请求头配置
        source={{
          uri: props.url,
          headers: {
            'referer': `${props.url}/`,
            'user-agent': userAgent
          },
        }}

        // 生命周期和事件处理
        onContentProcessDidTerminate={handleReload}
        onMessage={handleMessage}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onShouldStartLoadWithRequest={props.onShouldStartLoadWithRequest}
      />
    </View>
  );
});

export default WebviewCore;
