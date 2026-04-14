let aiChat = null;
const messageContainer = document.getElementById('chat-messages-container');
// const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('send-button');
const pauseButton = document.getElementById('pause-button'); // 新增暂停按钮
const uploadButton = document.getElementById('upload-button');
const textArea = document.getElementById('userInput');
let conversation_id = '';
let isInitialized = false;
let newMes = '';
let moleculeHandler = null;
// 队列存储未处理的 2D 消息
const messageQueue = [];

let currentImage = null;
let isChatActive = false;

// ================ 图片处理相关功能 ================
const ImageHandler = {
    // 触发图片上传
    triggerUpload() {
        document.getElementById('imageInput').click();
    },

    // 验证图片
    validateImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件！');
            return false;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过 5MB！');
            return false;
        }
        return true;
    },

    // 处理图片上传请求
    async uploadImage(file, messageToSend) {
        const loadingOverlay2 = document.querySelector('#loading-overlay-2');
        try {
            loadingOverlay2.classList.add('loading_overlay_active');

            const formData = new FormData();
            formData.append('image', file);
            if (messageToSend) {
                formData.append('message', messageToSend);
                appendMessage(messageToSend, true);
            }

            const result = await apiService.uploadImage(formData);

            if (result && !result[0].error) {
                let data = result[0];
                data.data = decodeURIComponent(data.data);
                unitMain.sendMessage('render2D', data.data, '2d');
            } else {
                message.error('上传失败');
            }

            userInput.value = '';

        } catch (error) {
            appendMessage('图片上传失败，请重试', false);
        } finally {
            loadingOverlay2.classList.remove('loading_overlay_active');
        }
    }
};

// 设置图片上传事件监听
document.getElementById('imageInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file && ImageHandler.validateImage(file)) {
        const messageToSend = userInput.value.trim();
        await ImageHandler.uploadImage(file, messageToSend);
        event.target.value = ''; // 清空文件输入
    }
});

// ================ AI与2D通信功能 ================

// 监听 2D 发来的消息并入队
unitMain.on('toAI', (data) => {
    if (data && data.data && data.data.length > 0) {
        messageQueue.push(data.data[0]); // 将消息存储到队列
        processQueue(); // 处理队列中的消息
    } else {
        console.warn("接收到的 2D 消息数据为空");
    }
});
let isProcessing = false;

async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    isProcessing = true;

    try {
        const message = messageQueue.shift();
        newMes = message;
        // await moleculeHandler.handleUserInput(newMes);
    } catch (err) {
        console.error('Error in processQueue:', err);
    } finally {
        isProcessing = false;
    }
}

// ================ 初始化AI聊天 ================

async function initializeChat() {
    if (isInitialized) return;

    try {
        aiChat = new AIChat({
            baseURL: window.parent.API_BASE_URL || 'https://moleditor.com',
            communicationClient: {}
        });

        await aiChat.ready;

        // 初始化分子处理器
        moleculeHandler = new MoleculeCommandHandler({
            messageContainer,
            handlers: {
                appendMessage: appendMessage,
                onCommandResult: (result) => {
                    // 处理 handleCommand 的结果
                    unitMain.sendMessage('render2D', result.data.sdf_data, '2d');
                }
            },
            createMessageElement: createMessageElement,
            aiChat
        });
        aiChat.setHandlers({
            onMessage: (msg) => {
                if (!msg || !msg.answer || aiChat.mode !== 'chat') return;

                const currentElement = aiChat.messageHandler.currentMessageElement;

                if (!currentElement) {
                    const messageElement = createMessageElement('', false);
                    const chatContainer = document.getElementById('chat-messages-container');
                    if (chatContainer) {
                        chatContainer.appendChild(messageElement);
                        aiChat.messageHandler.currentMessageElement = messageElement;

                        // 添加动画到头像
                        const avatar = messageElement.querySelector('.chat-avatar');
                        if (avatar) {
                            avatar.classList.add('am-rotate');
                        }
                    }
                }
            },
            onThought: (msg) => {
                // 可以添加思考中的动画
                unitMain.sendMessage('startAI', '', '3d');
                unitMain.sendMessage('startAIFor2d', '', '2d');
                isChatActive = true;
                if (msg && msg.conversation_id) {
                    conversation_id = msg.conversation_id;
                    // 更新聊天状态
                    chatState.conversationId = msg.conversation_id;
                    chatState.startTime = new Date();
                }
            },
            onEnd: (msg) => {
                unitMain.sendMessage('endAI', '', '3d');
                sendButton.style.display = 'inline-block'; // 显示发送按钮
                pauseButton.style.display = 'none'; // 隐藏暂停按钮
                isChatActive = false; // 设置对话状态为非活动
                const loadingOverlay2 = document.querySelector('#loading-overlay-2');
                loadingOverlay2.classList.remove('loading_overlay_active');
                uploadButton.classList.remove('disabled');
                textArea.classList.remove('disabled');
                sendButton.classList.remove('disabled');
                if (msg && msg.conversation_id) {
                    conversation_id = msg.conversation_id;
                }

                // 移除当前消息元素头像的动画
                if (aiChat.messageHandler.currentMessageElement) {
                    const avatar = aiChat.messageHandler.currentMessageElement.querySelector('.chat-avatar');
                    if (avatar) {
                        avatar.classList.remove('am-rotate');
                    }
                }

                // 重置当前消息元素
                aiChat.messageHandler.currentMessageElement = null;
            },
            onError: (error) => {
                appendMessage('对话出错，请重试');
                aiChat.messageHandler.currentMessageElement = null;
            },
            // 添加图片接收处理器
            onImageReceived: (imageData) => {
                // 创建包含图片的消息元素
                const messageElement = createMessageElement('', false);

                // 创建图片元素
                const imgElement = document.createElement('img');
                // 直接使用 base64 图片数据
                imgElement.src = imageData.data.image_data; // 修改这里使用返回的 base64 数据
                imgElement.alt = 'Molecule Visualization';
                imgElement.className = 'molecule-image';

                // 添加图片加载事件处理
                imgElement.onload = () => {
                    messageContainer.scrollTop = messageContainer.scrollHeight;
                };

                // 添加图片加载错误处理
                imgElement.onerror = () => {
                    appendMessage('图片加载失败', false);
                };

                // 将图片添加到消息元素中
                messageElement.appendChild(imgElement);
                messageContainer.appendChild(messageElement);

                // 添加提示信息
                appendMessage('请输入您的处理需求：', false);
            }
        });

        isInitialized = true;
        // appendMessage('你好！我是AI助手，有什么可以帮你的吗？');
    } catch (error) {
        console.error('Failed to initialize AI Chat:', error);
        isInitialized = false;
        setTimeout(initializeChat, 5000);
    }
}
initializeChat()
marked.setOptions({
    breaks: true,  // 启用换行支持
    gfm: true,     // 启用 GitHub 风格的 markdown
});

function createMessageElement(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user-message' : ''}`;

    // 为 AI 消息添加头像
    if (!isUser) {
        const avatarImg = document.createElement('img');
        avatarImg.src = './images/moleditor-64x64.ico';
        avatarImg.className = 'chat-avatar';
        avatarImg.alt = 'AI';
        messageDiv.appendChild(avatarImg);
    }

    const chatBubble = document.createElement('div');
    chatBubble.className = 'chat-bubble';

    // 创建 markdown 内容容器
    const markdownContent = document.createElement('div');
    markdownContent.className = 'markdown-content';
    markdownContent.innerHTML = message ? marked.parse(message) : '';

    chatBubble.appendChild(markdownContent);
    messageDiv.appendChild(chatBubble);

    return messageDiv;
}

function appendMessage(message, isUser = false) {
    const chatContainer = document.getElementById('chat-messages-container');
    if (!chatContainer) return;

    const messageElement = createMessageElement(message, isUser);
    chatContainer.appendChild(messageElement);

    // 滚动到容器底部以显示最新消息
    const showAIContent = document.querySelector('.show-AI-content');
    showAIContent.scrollTop = showAIContent.scrollHeight;
    // popupAIChat();
}

async function sendMessage() {
    if (!isInitialized || !moleculeHandler) {
        appendMessage('系统未初始化，请稍后重试', false);
        return;
    }

    const messageToSend = userInput.value.trim();
    if (messageToSend) {
        userInput.value = '';
        try {
            // 使用 MoleculeFormatChecker 检查输入字符串的格式
            const format = MoleculeFormatChecker.checkFormat(messageToSend);
            if (!isNaN(messageToSend) && messageToSend.trim() !== '') {  // 判断 messageToSend 是否为有效的数字
                // 如果是有效的数字，调用 getMolecule 函数
                const moleculeId = Number(messageToSend);  // 转换为数字
                getMolecularById(moleculeId)
                    .then(result => {
                        unitMain.sendMessage('render2D', result.sdf, '2d');
                        // 调用全局函数添加到正在编辑的分子列表
                        editingMoleculeListManager.addMolecule({
                            smiles: result.sdf,
                            name: result.name,
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching molecule data:', error);
                    });

            } else if (format === "SDF" || format === "SMILES" || format === "MOL") {
                unitMain.sendMessage('render2D', messageToSend, '2d');
            } else {
                appendMessage(messageToSend, true);
                await moleculeHandler.handleUserInput(messageToSend);
            }
        } catch (error) {
            appendMessage('处理失败，请重试', false);
        }
    }
}

const chatState = {
    conversationId: '',
    startTime: null
};

function resetChatState() {
    // 更新对象的属性而不是重新赋值整个对象
    chatState.conversationId = '';
    chatState.startTime = null;
}

// 添加停止对话的功能
pauseButton.addEventListener('click', async () => {
        // 发送请求到新的接口以终止对话
        try {
            if(!chatState.conversationId){
                unitMain.sendMessage('stopAI', '', 'ai-chat');
                const loadingOverlay2 = document.querySelector('#loading-overlay-2');
                loadingOverlay2.classList.remove('loading_overlay_active');
                sendButton.style.display = 'inline-block'; // 显示发送按钮
                pauseButton.style.display = 'none'; // 隐藏暂停按钮
                uploadButton.classList.remove('disabled');
                textArea.classList.remove('disabled');
                sendButton.classList.remove('disabled');
                isChatActive = false; // 设置对话状态为非活动
                resetChatState();
                return;

            }else if(chatState.startTime && (new Date() - chatState.startTime) > 30000){
                const loadingOverlay2 = document.querySelector('#loading-overlay-2');
                loadingOverlay2.classList.remove('loading_overlay_active');
                sendButton.style.display = 'inline-block'; // 显示发送按钮
                pauseButton.style.display = 'none'; // 隐藏暂停按钮
                uploadButton.classList.remove('disabled');
                textArea.classList.remove('disabled');
                sendButton.classList.remove('disabled');
                isChatActive = false; // 设置对话状态为非活动
                resetChatState();
                return;
            }else{
                unitMain.sendMessage('stopAI', '', 'ai-chat');
                // const response = await fetch(`https://moleditor.com/ai/chat/${conversation_id}`, {
                //     method: 'PUT',
                //     headers: {
                //         'Content-Type': 'application/json'
                //     },
                //     body: JSON.stringify({ action:'stop' }) // 发送当前对话 ID
                // });
                const response = await apiService.stopAI(conversation_id);
                console.log(response)
                if (response) {
                    const loadingOverlay2 = document.querySelector('#loading-overlay-2');
                    loadingOverlay2.classList.remove('loading_overlay_active');
                    sendButton.style.display = 'inline-block'; // 显示发送按钮
                    pauseButton.style.display = 'none'; // 隐藏暂停按钮
                    uploadButton.classList.remove('disabled');
                    textArea.classList.remove('disabled');
                    sendButton.classList.remove('disabled');
                    isChatActive = false; // 设置对话状态为非活动
                } else {
                    appendMessage('终止对话失败，请重试', false);
                }

            }
        } catch (error) {
            appendMessage('终止对话请求失败，请重试', false);
        }finally{
            resetChatState();
        }
    
});


// 为 copyMessage 和 addToCanvas 添加标签
function copyMessage(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            alert('已复制到剪贴板');
            // 添加 copy 标签
            appendMessage('@copy', false);
        })
        .catch(err => console.error('复制失败:', err));
}

function addToCanvas(content) {
    communicationClient.sendMessage('parent', { content }, 'addToCanvas');
    // 添加 apply 标签
    appendMessage('@apply', false);
}

// 导出必要的函数
window.triggerImageUpload = ImageHandler.triggerUpload;
window.removeImage = ImageHandler.remove;

// 添加输入框自动调整高度的功能
function initTextareaAutoHeight() {
    const textarea = document.getElementById('userInput');
    const inputContainer = document.querySelector('.input-container');
    const lineHeight = 20; // 根据你的 CSS 中设置的 line-height
    const maxLines = 5;
    const paddingTop = 16; // 根据你的 CSS padding 设置
    const paddingBottom = 16;
    const maxHeight = (lineHeight * maxLines) + paddingTop + paddingBottom;

    // 计算可放置的最大字符数
    function calculateMaxChars() {
        const computedStyle = window.getComputedStyle(textarea);
        const fontSize = parseFloat(computedStyle.fontSize);
        const containerWidth = inputContainer.clientWidth - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight);
        const charsPerLine = Math.floor(containerWidth / fontSize) - 6;
        return charsPerLine; // 返回每行可放置的字符数
    }

    function adjustHeight() {
        const maxChars = calculateMaxChars(); // 获取当前可放置的最大字符数
        const textLength = textarea.value.length;

        // 重置高度以获取实际内容高度
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;

        // 只在第一行到第二行转换时检查字数
        if (textLength < maxChars) {
            // 字数小于可放置的最大字符数，保持单行高度
            textarea.style.height = '55px';
            inputContainer.style.borderRadius = '100px';
        } else {
            // 字数达到最大字符数，开始根据内容高度调整
            const newHeight = Math.min(Math.max(52, scrollHeight), maxHeight);
            textarea.style.height = newHeight + 'px';
            inputContainer.style.borderRadius = newHeight > 55 ? '20px' : '100px';
        }

        // 当内容超过最大高度时，启用滚动
        textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }

    // 设置初始高度
    textarea.style.height = '55px';

    // 监听输入事件
    textarea.addEventListener('input', adjustHeight);

    // 监听键盘事件
    textarea.addEventListener('keydown', function(e) {
        // 延迟执行以确保内容已更新
        setTimeout(adjustHeight, 0);
    });

    // 监听窗口大小变化以重新计算最大字符数
    window.addEventListener('resize', adjustHeight);
}

// 在初始化时调用
initTextareaAutoHeight();







