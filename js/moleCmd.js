class MoleculeCommandHandler {
    constructor(options = {}) {
        this.currentSdfData = [];
        this.moleculeImage = null;
        this.handlers = options.handlers || {};
        this.messageContainer = options.messageContainer;
        this.apiEndpoint = 'https://moleditor.com:3003/api/molecule/modify';
        this.aiChat = options.aiChat; // 添加 AIChat 实例引用
        this.createMessageElement = options.createMessageElement;

        // 绑定必要的方法
        this.appendMessage = this.appendMessage.bind(this);
        this.processSdfText = this.processSdfText.bind(this);

        // 绑定事件监听器
        unitMain.on('toAI', (data) => {
            this.currentSdfData = data;
        });
    }

    // 添加消息的方法
    appendMessage(message, isUser = false) {
        if (this.handlers.appendMessage) {
            this.handlers.appendMessage(message, isUser);
        }
    }

    // 处理SDF文本格式
    processSdfText(sdfText) {
        let processedSdf = sdfText;
        return `\n${processedSdf}`;
    }

    // 根据数据长度来判断动画时长
    dataTimerSlice(dataLength) {
        if (dataLength >= 100) return 2000;
        if (dataLength >= 50) return 680;
        if (dataLength >= 30) return 500;
        if (dataLength >= 20) return 350;
        return 220;
    }

    // 处理代码块的渲染
    async renderMoleculeFromCodeBlocks(codeElements) {
        let renderedCodeCount = 0;
        for (const [idx,codeElement] of codeElements.entries()) {
            const codeContent = codeElement.textContent; // 获取 code 内容
            const molelist = codeContent.split('\n').filter(p => p.length > 0);
            for (const [index,data] of molelist.entries()) {
                if (!MoleculeFormatChecker.isSmiles(data)) {
                    continue
                }

                setTimeout(() => {
                    if(idx === 0&&index === 0){
                        unitMain.sendMessage('render2D', data, '2d');
                    }

                    editingMoleculeListManager.addMolecule({
                        smiles: data,
                        name: data,
                    },  idx === 0 && index === 0);
                }, 10);
                // + renderedCodeCount * this.dataTimerSlice(data.length)
                renderedCodeCount++;
            }
        }

        if (renderedCodeCount > 0) {
            console.log(`All ${renderedCodeCount} code blocks rendered to 2D.`);
        }
    }

    // 显示模态框
    showRemind(content) {
        const modal = document.getElementById('modal');
        const codeContent = document.getElementById('code-content');
        codeContent.innerHTML = content;
        modal.style.width = '40%';
        modal.style.height = '1%';
        modal.style.top = '1%';
        modal.style.left = '35%';
        modal.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        codeContent.style.height = '1%';
        modal.style.display = 'block';
        // 隐藏按钮逻辑
        const closeModal = document.getElementById('close-modal');
        closeModal.style.display = 'none';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 3000)
    }
    // 显示模态框
    showModal(content) {
        const modal = document.getElementById('modal');
        const codeContent = document.getElementById('code-content');
        codeContent.innerHTML = content;
        modal.style.display = 'block';

        const closeModal = document.getElementById('close-modal');
        closeModal.onclick = () => modal.style.display = 'none';

        window.onclick = (event) => {
            if (event.target === modal) modal.style.display = 'none';
        };
    }

    async handleUserInput(message) {
        try {
            // 显示加载动画
            this.toggleLoading(true);

            if (/合成路线|合成路径|生成路线|生成路径/.test(message)) {
                await this.handleSynthesisRoute(message);
            } else if (/生成|创建|创造|给出|给我/.test(message) || /我需要.*分子/.test(message)) {
                await this.handleMoleculeGeneration(message);
            } else if (/优化|改善|增强|减弱/.test(message)) {
                await this.handleOptimization(message);
            } else {
                await this.handleDefaultMessage(message);
            }

            this.toggleLoading(false);

        } catch (error) {
            console.error('Error handling user input:', error);
            this.appendMessage('处理请求失败，请重试', false);
            this.toggleLoading(false);
        }
    }

    // 显示或隐藏加载动画
    toggleLoading(isLoading) {
        const sendButton = document.getElementById('send-button');
        const pauseButton = document.getElementById('pause-button');
        const loadingOverlay = document.querySelector('#loading-overlay-2');
        const userInput = document.getElementById('userInput');
        const uploadButton = document.getElementById('upload-button');

        sendButton.style.display = isLoading ? 'none' : 'inline-block';
        pauseButton.style.display = isLoading ? 'inline-block' : 'none';
        loadingOverlay.classList.toggle('loading_overlay_active', isLoading);
        uploadButton.classList.toggle('disabled', isLoading);
        userInput.classList.toggle('disabled', isLoading);
    }

    async handleSynthesisRoute(message) {
        const response = await this.aiChat.sendMessage(message, '', { stream: true });
        const currentBubble = aiChat.lastMegElement?.querySelector('.chat-bubble');
        const routeContent = currentBubble?.innerHTML || "";
        this.showModal(routeContent.replace(/@molecular_data smiles/g, '').trim());
    }

    async handleMoleculeGeneration(message) {
        message += "尽量给我smiles";
        const response = await this.aiChat.sendMessage(message, '', { stream: true });
        const currentBubble = aiChat.lastMegElement?.querySelector('.chat-bubble');
        const codeElements = currentBubble.querySelectorAll('code');

        if (codeElements.length > 0) {
            await this.renderMoleculeFromCodeBlocks(codeElements);
        } else {
            this.showRemind('根据你的当前描述无法生成分子，请重新描述');
        }
    }

    async handleOptimization(message) {
        message = `${this.currentSdfData.data[0]} \n 以上是分子式数据，请根据以下描述优化分子：${message}`;
        const response = await this.aiChat.sendMessage(message, '', { stream: true });
        const currentBubble = aiChat.lastMegElement?.querySelector('.chat-bubble');
        const codeElements = currentBubble ? currentBubble.querySelectorAll('code') : [];

        if (codeElements.length > 0) {
            await this.renderMoleculeFromCodeBlocks(codeElements);
        } else {
            this.showRemind('根据你的当前描述无法优化分子，请重新描述');
        }
    }

    async handleDefaultMessage(message) {
        const response = await this.aiChat.sendMessage(message, '', { stream: true });
        const currentBubble = aiChat.lastMegElement?.querySelector('.chat-bubble');
        const codeElements = currentBubble.querySelectorAll('code');

        if (codeElements.length > 0) {
            await this.renderMoleculeFromCodeBlocks(codeElements);
        }
    }

    // 处理命令的函数
    async handleCommand(data) {
        try {
            console.log("查询分子", data.keywords[0]);
            const params = { kwd: data.keywords.join(';'), name: data.name || '' };
            console.log("调用 getMolecularList，参数:", params);
            const result = await getMolecularList(params);

            if (result && result.list && result.list.length > 0) {
                unitMain.sendMessage('render2D', result.list[0].smiles, '2d');
            } else {
                this.appendMessage('未找到相关分子数据', false);
            }
        } catch (error) {
            console.error('Error handling command:', error);
            this.appendMessage('执行命令失败，请重试', false);
        }
    }
}

window.MoleculeCommandHandler = MoleculeCommandHandler;
