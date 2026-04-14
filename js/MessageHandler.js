class MessageHandler {
    constructor(handlers, communicationClient) {
        this.handlers = handlers;
        this.communicationClient = communicationClient;
        this.currentAnswer = ''; // 用于累积消息
        this.currentMessageElement = null; // 用于存储当前消息元素
    }

    setHandlers(handlers) {
        Object.assign(this.handlers, handlers);
    }

    handleMessage(msg) {
        try {
            let jsonData = JSON.parse(msg.data);
            switch (msg.event) {
                case 'agent_message':
                    // 处理换行符
                    const newContent = this.formatContent(jsonData.answer || '');
                    this.currentAnswer += newContent;
                    this.handlers.onMessage?.({
                        answer: newContent, // 只发送新的内容片段
                        fullAnswer: this.currentAnswer,
                        isPartial: true
                    });
                    break;
                case 'message_end':
                    this.handlers.onEnd?.({
                        ...jsonData,
                        answer: this.currentAnswer
                    });
                    this.currentAnswer = '';
                    break;
                case 'agent_thought':
                    this.handlers.onThought?.(jsonData);
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            this.handlers.onError?.(error);
        }
    }

    handleMessages(messages) {
        if (!Array.isArray(messages)) {
            console.warn('Expected messages array, got:', typeof messages);
            return;
        }

        for (const msg of messages) {
            this.handleMessage(msg);
        }
    }

    // 处理内容格式化
    formatContent(content) {
        if (!content) return '';

        try {
            // 尝试解析 JSON
            const jsonContent = JSON.parse(content);
            console.log("jsonContent",jsonContent.action_input)
            // 如果是包含 action_input 的消息格式
            if (jsonContent.action_input) {
                // 处理 action_input 中的换行符
                return jsonContent.action_input
                    .replace(/\\n/g, '\n')  // 替换 \n 为实际换行符
                    .replace(/markdown\\n/g, '')  // 移除 markdown\n 前缀
                    .replace(/\\"/g, '"');  // 处理转义的引号
            }
            
            // 如果是普通的 JSON 消息
            if (jsonContent.answer) {
                return jsonContent.answer
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"');
            }
    
            // 如果都不是，返回原始内容
            return content;
        } catch (e) {
            // 如果不是 JSON，直接处理原始内容
            return content
                .replace(/\\n/g, '\n')
                .replace(/markdown\\n/g, '')
                .replace(/\\"/g, '"');
        }
    }
}