class MessageBus {
  static CHANNEL_NAME = 'cross-app-communication';
  static APP_REGISTER = 'APP_REGISTER';
  static APP_UNREGISTER = 'APP_UNREGISTER';

  static getInstance() {
    if (!window._messageBus) {
      window._messageBus = new MessageBus();
    }
    return window._messageBus;
  }

  constructor() {
    this.appList = new Map();
    this.messageCache = new Map();
    this.listeners = new Map();

    this.mainChannel = new BroadcastChannel(MessageBus.CHANNEL_NAME);
    this.mainChannel.onmessage = (event) => {
      this.handleIncomingMessage(event);
    };

    window._messageBus = this;

    // 监听应用注册/注销消息
    this.on(MessageBus.APP_REGISTER, ({ data }) => {
      this.appList.set(data.appName, 'loaded');
      this.sendCachedMessages(data.appName);
    });

    this.on(MessageBus.APP_UNREGISTER, ({ data }) => {
      this.appList.delete(data.appName);
    });
  }
  /**
   * 发送消息
   * @param {Object} message 消息对象
   * @param {string} message.type 消息类型
   * @param {*} message.data 消息数据
   * @param {string} message.target 目标应用
   */
  sendMessage(type, data, target) {
    const message = { type, data, target };
    const targetStatus = this.appList.get(target);
    // 如果应用未加载或不存在，缓存消息
    if (!targetStatus) {
      this.cacheMessage(target, message);
      return this;
    }
    // 直接发送消息
    this.postMessage(message);
    return this;
  }

  /**
   * 缓存消息
   * @param {string} appName 应用名称
   * @param {Object} message 消息对象
   */
  cacheMessage(appName, message) {
    if (!this.messageCache.has(appName)) {
      this.messageCache.set(appName, []);
    }
    this.messageCache.get(appName).push(message);
  }

  /**
   * 标记应用为已加载状态
   * @param {string} appName 应用名称
   */
  registerApp(appName) {
    this.appList.set(appName, 'loaded');
    // 广播注册消息，通知其他 iframe
    this.postMessage({
      type: MessageBus.APP_REGISTER,
      data: { appName },
      target: '*'
    });
    return this;
  }
   /**
   * 注销应用
   * @param {string} appName 应用名称
   */
  unregisterApp(appName) {
    this.appList.delete(appName);
    // 广播注销消息
    this.postMessage({
      type: MessageBus.APP_UNREGISTER,
      data: { appName },
      target: '*'
    });
    return this;
  }
  /**
   * 发送缓存的消息
   * @param {string} appName 应用名称
   */
  sendCachedMessages(appName) {
    const cachedMessages = this.messageCache.get(appName);
    if (cachedMessages) {
      cachedMessages.forEach(msg => this.postMessage(msg));
      this.messageCache.delete(appName);
    }
  }

  /**
   * 发送消息到频道
   * @param {Object} message 消息对象
   */
  postMessage(message) {
    this.mainChannel.postMessage(message);
  }

  /**
   * 处理接收到的消息
   * @param {MessageEvent} event 消息事件
   */
  handleIncomingMessage(event) {
    const message = event.data;
    if (!message || !message.type) return;
    // 触发监听器
    const appListeners = this.listeners.get(message.type);
    if (appListeners) {
      appListeners.forEach(listener => listener(message));
    }
  }
  /**
   * 添加消息监听器
   * @param {string} type 消息类型
   * @param {Function} callback 回调函数
   * @returns {Function} 取消监听的函数
   */
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const listenerSet = this.listeners.get(type);
    listenerSet.add(callback);
    // 返回取消监听的函数
    return () => {
      listenerSet.delete(callback);
    };
  }
}

