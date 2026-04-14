class AIChat {
    constructor(options = {}) {
        // 默认配置
        this.config = {
            timeout: 30000,
            retryTimes: 3,
            retryDelay: 1000,
            ...options
        };

        // 事件处理器
        this.handlers = {
            onMessage: null,
            onError: null,
            onEnd: null,
            onThought: null
        }

        this.communicationClient = options.communicationClient;
        this.ready = this.initialize();
        // 初始化消息处理器
        this.messageHandler = new MessageHandler(this.handlers, this.communicationClient);

        // 聊天模式
        this.mode = '';
        // 分子图片
        this.moleculeImage = null;

        this.lastMegElement = null;
        this.isProcessing = false; // 添加处理状态标志
    }

    async initialize() {
        try {
            // 初始化通信
            if (this.communicationClient) {
                await this.initCommunication();
            }
            return true;
        } catch (error) {
            console.error('Initialization failed:', error);
            throw error;
        }
    }

    async initCommunication() {
    }

    setHandlers(handlers) {
        this.handlers = handlers;
        this.messageHandler.setHandlers(handlers);
    }
   
    async sendMessage(message, conversationId = '', options = { stream: true }) {
        this.mode = '';
        if (!message.trim()) {
            throw new Error('Message cannot be empty');
        }
        
        // 如果已经在处理中，先停止之前的处理
        if (this.isProcessing) {
            this.stopProcessing();
        }
        
        this.isProcessing = true;
        unitAI.registerApp('ai-chat');

        let retryCount = 0;
        const doRequest = async (callback) => {
            try {
                if (options.stream) {
                    const controller = new AbortController();
                    const signal = controller.signal;
                    
                    // 存储 controller
                    this.currentController = controller;
                    
                    unitAI.on('stopAI', () => {
                        this.stopProcessing();
                    });

                    const response = await apiService.sendMessageToAI({
                        query: message,
                        conversation_id: conversationId,
                        stream: true
                    }, signal);
                    if (!response.ok) {
                        if(response.status === 401){
                            return elements.loginModalOverlay.style.display = 'flex';
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    if(!this.isProcessing){
                        aiChat.messageHandler.currentMessageElement = null;
                    
                        return { type: 'abort' };
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let fullResponse = '';

                    const render = (msg) => {
                        if (aiChat.messageHandler.currentMessageElement) {
                            this.lastMegElement = aiChat.messageHandler.currentMessageElement;
                            const currentBubble = aiChat.messageHandler.currentMessageElement.querySelector('.chat-bubble');
                            if (currentBubble) {
                                currentBubble.style.fontSize = '95%';
                                currentBubble.style.lineHeight = '1.5';
                                currentBubble.style.display = 'block';
                                currentBubble.innerHTML = marked.parse(msg);
                                currentBubble.queryAll('a', x => {
                                    x.target = "_blank";
                                });

                                currentBubble.queryAll('blockquote', x => {
                                    x.style.cssText = 'padding:0.5rem;background:#f1f2f3;';
                                });

                                currentBubble.queryAll('code', x => {
                                    hljs.highlightElement(x);
                                });

                                const chatContainer = document.querySelector('.show-AI-content');
                                if (chatContainer) {
                                    chatContainer.scrollTop = chatContainer.scrollHeight;
                                }
                            }
                        }
                    };

                    try {
                        while (true) {
                            const { value, done } = await reader.read();
                            if (done) break;

                            if (!this.isProcessing) {
                                await reader.cancel();
                                break;
                            }

                            const chunk = decoder.decode(value, { stream: true });
                            if (chunk.trim()) {
                                const messages = this.parseMessage(chunk);
                                this.messageHandler.handleMessages(messages);

                                if (!Array.isArray(messages)) {
                                    messages = [messages]
                                }

                                messages.forEach(x => {
                                    if (x.event !== 'agent_message') {
                                        if (x.event === 'message_end') {
                                            if (this.mode === 'cmd') {
                                                if (fullResponse.trim().endsWith('}```')
                                                    || fullResponse.endsWith('}') === 0
                                                    || fullResponse.trim().endsWith('}```')
                                                    || fullResponse.trim().endsWith('}\n```')
                                                ) {
                                                    return fullResponse;
                                                }
                                            } else if (this.mode === 'chat') {
                                                render(fullResponse);
                                            }
                                        }
                                        return;
                                    }
                                    try {
                                        fullResponse += JSON.parse(x.data).answer || '';

                                        if (this.mode === 'cmd') {

                                        } else if (this.mode === 'chat') {
                                            render(fullResponse);
                                        }

                                        if (!this.mode) {
                                            let trim_text = fullResponse.trim()

                                            if (trim_text.indexOf('```json') === 0
                                                || trim_text.indexOf('{') === 0
                                                || trim_text.indexOf('\n{') === 0
                                                || trim_text.indexOf('```\njson') === 0
                                            ) {
                                                this.mode = 'cmd';
                                            } else {
                                                if (trim_text.length > 10)
                                                    this.mode = 'chat';
                                            }
                                        } else {
                                            callback
                                                && typeof callback === 'function'
                                                && this.mode === 'chat'
                                                && callback(fullResponse);
                                        }
                                    } catch (err) {
                                        console.error('Error processing message:', err);
                                    }
                                });
                            }
                        }
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            await reader.cancel();
                        }
                        throw error;
                    }

                    return { type: 'stream', data: fullResponse };
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log('请求被中止');
                    return { type: 'abort' };
                }
                if (retryCount < this.config.retryTimes) {
                    retryCount++;
                    await this.delay(this.config.retryDelay);
                    return doRequest();
                }
                this.handlers.onError?.(error);
                throw error;
            } finally {
                this.isProcessing = false;
                this.currentController = null;
            }
        };

        return doRequest(options.callback);
    }


    // 添加停止处理的方法
    stopProcessing() {
        this.isProcessing = false;
        aiChat.lastMegElement = null;
        aiChat.messageHandler.currentMessageElement = null;
        if (this.currentController) {
            this.currentController.abort();
            this.currentController = null;
        }
    }

    processChunk(chunk) {
        // 解析消息
        const messages = this.parseMessage(chunk);
        // 使用消息处理器处理消息
        this.messageHandler.handleMessages(messages, this.communicationClient);
    }

    // 解析单条消息
    parseSingleMessage(data) {
        const datalines = data.split('\n')
            .map(x => x.trim())
            .filter(x => x.length > 0);

        let msg = {
            event: '',
            data: '',
        };

        for (const line of datalines) {
            const ind = line.indexOf(':');
            if (ind <= 0) continue;

            const key = line.substring(0, ind).trim();
            const val = line.substring(ind + 1).trim();

            if (!key || !val) continue;

            this.setMsgData(msg, key, val);
        }

        // 如果没有event但有data，设为普通消息
        if (!msg.event) {
            if (!msg.data) return null;
            msg.event = 'message';
        }

        return msg;
    }

    // 解析多条消息
    parseMessage(data) {
        const lines = data.split(/\r?\n/)
            .map(x => x.trim())
            .filter(x => x.length > 0);

        const msglist = [];
        let currentMsg = {
            event: '',
            data: ''
        };

        for (const line of lines) {
            if (line.startsWith('event:')) {
                // 如果已经有累积的消息，先保存它
                if (currentMsg.event || currentMsg.data) {
                    msglist.push({ ...currentMsg });
                }
                // 开始新消息
                currentMsg = {
                    event: line.substring(6).trim(),
                    data: ''
                };
            } else if (line.startsWith('data:')) {
                currentMsg.data = line.substring(5).trim();
            }
        }

        // 保存最后一条消息
        if (currentMsg.event || currentMsg.data) {
            msglist.push(currentMsg);
        }

        return msglist;
    }

    // 设置消息数据
    setMsgData(msg, key, val) {
        switch (key.toLowerCase()) {
            case 'event':
                msg.event = val;
                break;
            case 'data':
                msg.data = val;
                break;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
    }

    handleAddToCanvas(content) {
        if (this.communicationClient) {
            this.communicationClient.sendMessage('parent', { content }, 'addToCanvas');
        }
    }

}

window.AIChat = AIChat;