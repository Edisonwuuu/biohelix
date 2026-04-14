// 统一管理 DOM 选择器
const SELECTORS = {
    btn3d: '#btn-3d',
    mole3d: '#mole-3d',
    loadingOverlay: '#loading-overlay',
    loadingText: '#loading_text',
    moleFeatureBox: '#mole-feature-box',
    moleEditor: '#mole-editor',
    inputArea: '.input-area',
    aiChat: '.ai-chat-container',
    menu: '#menu',
    propertyBtn: '#mole-property',
    molePropertyCancel: '#mole-property-cancel',
    sidebar: '.sidebar',
    viewWrapper: '.view-wrapper',
    userInfo: '.user-info',
    loginModalOverlay: '.login-modal-overlay',
    loginTab: '.login-tab',
    formContainer: '.form-container',
    loginForm: '.login-form',
    registerForm: '.register-form',
    loginBtn: '.login-btn',
    registerBtn: '.register-btn',
    loginModalCancel: '.login-modal-cancel',
    nameModalOverlay: '.name-modal-overlay',
    nameModalInput: '.name-modal-input input',
    nameModalSave: '.name-modal-save',
    nameModalCancel: '.name-modal-cancel',
    clearAllBtn: '.mole-title-right',
};
// DOM 元素缓存
const elements = {
    btn3d: document.querySelector(SELECTORS.btn3d),
    mole3d: document.querySelector(SELECTORS.mole3d),
    loadingOverlay: document.querySelector(SELECTORS.loadingOverlay),
    loadingText: document.querySelector(SELECTORS.loadingText),
    moleFeatureBox: document.querySelector(SELECTORS.moleFeatureBox),
    moleEditor: document.querySelector(SELECTORS.moleEditor),
    inputArea: document.querySelector(SELECTORS.inputArea),
    aiChat: document.querySelector(SELECTORS.aiChat),
    menu: document.querySelector(SELECTORS.menu),
    propertyBtn: document.querySelector(SELECTORS.propertyBtn),
    molePropertyCancel: document.querySelector(SELECTORS.molePropertyCancel),
    viewWrapper: document.querySelector(SELECTORS.viewWrapper),
    sidebar: document.querySelector(SELECTORS.sidebar),
    userInfo: document.querySelector(SELECTORS.userInfo),
    loginModalOverlay: document.querySelector(SELECTORS.loginModalOverlay),
    loginTab: document.querySelectorAll(SELECTORS.loginTab),
    formContainer: document.querySelectorAll(SELECTORS.formContainer),
    loginForm: document.querySelector(SELECTORS.loginForm),
    registerForm: document.querySelector(SELECTORS.registerForm),
    registerBtn: document.querySelector(SELECTORS.registerBtn),
    loginBtn: document.querySelector(SELECTORS.loginBtn),
    loginModalCancel: document.querySelector(SELECTORS.loginModalCancel),
    nameModalOverlay: document.querySelector(SELECTORS.nameModalOverlay),
    nameModalInput: document.querySelector(SELECTORS.nameModalInput),
    nameModalCancel: document.querySelector(SELECTORS.nameModalCancel),
    nameModalSave: document.querySelector(SELECTORS.nameModalSave),
    clearAllBtn: document.querySelector(SELECTORS.clearAllBtn),
};

// 初始化 iframe 源
const loadingController = {
    show: () => elements.loadingOverlay.classList.add('loading_overlay_active_3d'),
    hide: () => elements.loadingOverlay.classList.remove('loading_overlay_active_3d')
};
const initApp = () => {
    // 注册主应用
    unitMain.registerApp('main-app');
    // 立场转换loading显示事件
    unitMain.on('needLoading', loadingController.show);
    // 立场转换loading隐藏事件
    unitMain.on('hideLoading', loadingController.hide);
    unitMain.on('moleData', (data) => {
        state.smiles = data.data;
    });
    unitMain.on('set-edit-molecule', (data) => {
        editingMoleculeListManager.addMolecule({
            smiles: data.smiles,
            name: data.name,
        });
    });
    // 添加处理来自2D应用的SDF数据变化
    // unitMain.on('sdfChanged', async (content) => {
    //     const sdfData = content.data;
    //     console.log(123234,sdfData)
    //     // 如果当前是3D视图，则立即发送到3D应用
    //     if (elements.btn3d.classList.contains('active')) {
    //         unitMain.sendMessage('render-3d', sdfData, '3d');
    //     }
        
    //     // 更新状态管理
    //     await sdfDataManager.updateSdfDataAndFetch(sdfData);
    //     updateUI();
    // });
    unitMain.on('show-name-modal', () => {
        if(userManager.getUserData()){
            elements.nameModalOverlay.style.display = 'flex';
        }else{
            elements.loginModalOverlay.style.display = 'flex';
        }
    });
    const state = {
        canFetch: false,
        isAICreated: false,
        all_sdfData: [],
        moleFeatureArray: [],
        smiles: ''
    };

    // 正在编辑的分子列表管理器
    const editingMoleculeListManager = {
        getLocalMolecules() {
            const molecules = localStorage.getItem('editingMolecules');
            return molecules ? JSON.parse(molecules) : [];
        },
        saveLocalMolecules(molecules) {
            localStorage.setItem('editingMolecules', JSON.stringify(molecules));
        },
        async addMolecule(molecule, isFirst = false) {
            const molecules = this.getLocalMolecules();
            molecules.unshift({...molecule,id: SHA256.hash(molecule.name)});
            this.saveLocalMolecules(molecules);
    
            const moleculeItem = await this.createMoleculeItem(molecule, isFirst);
            const editingMoleculeList = document.querySelector('.editing-mole-list');
            editingMoleculeList.insertBefore(moleculeItem, editingMoleculeList.firstChild);
        },
        async createMoleculeItem(molecule, isFirst = false) {
            let image_url = '/images/mole.png';
            try {
                const res = await apiService.getMoleculeImage({smiles_data:molecule.name, id: molecule.id});
                if (res && res.data && res.data.image_data) {
                    image_url = res.data.image_data;
                }
            } catch (error) {
                console.error('获取分子图像失败:', error);
            }
            const item = document.createElement('li');
            if(isFirst){
                document.querySelectorAll('.mole-item').forEach(el => {
                    el.classList.remove('active');
                });
                item.className = 'mole-item active';
            }else{
                item.className = 'mole-item';
            }
            item.dataset.moleculeId = molecule.id;
            item.innerHTML = `
                <div class="mole-icon-wrapper" style="padding: ${image_url!=='/images/mole.png' ? '0' : '8px'}">
                    <img style="border-radius: ${image_url=='/images/mole.png' ? '0' : '50%'}" src="${image_url}" alt="mole-icon" class="mole-icon">
                </div>
                <div class="mole-info">
                    <span class="mole-smiles">${molecule.name}</span>
                </div>
                <img src="/images/cancel.svg" alt="delete-icon" class="delete-icon">
            `;
            this.addMoleculeItemListeners(item, molecule);
            return item;
        },
        addMoleculeItemListeners(item, molecule) {
            const deleteBtn = item.querySelector('.delete-icon');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMolecule(molecule.id);
            });
            item.addEventListener('click', () => {
                document.querySelectorAll('.mole-item').forEach(el => {
                    el.classList.remove('active');
                });
                item.classList.add('active');
                this.loadMolecule(molecule);
                const is3DView = elements.btn3d.classList.contains('active');
                if (is3DView) {
                    setTimeout(() => {
                        // 在3D视图下，触发力场转换
                        unitMain.sendMessage('render-3d', '', '3d');
                    }, 200); // 可以根据实际情况调整延时时间
                }
            });
        },
        loadMolecule(molecule) {
            unitMain.sendMessage('render2D', molecule.smiles, '2d');
            // 在PC端不回收侧边栏
            if (window.innerWidth <= 768) {
                elements.sidebar.style.width = "0";
            }
        },
        deleteMolecule(moleculeId) {
            if (!confirm('确定要删除这个分子吗？')) return;
            
            const molecules = this.getLocalMolecules();
            const updatedMolecules = molecules.filter(m => m.id !== moleculeId);
            this.saveLocalMolecules(updatedMolecules);
            
            const item = document.querySelector(`[data-molecule-id="${moleculeId}"]`);
            if (item) item.remove();
        },
        clearAll() {
            const editingMoleculeList = document.querySelector('.editing-mole-list');
            editingMoleculeList.innerHTML = '';
            this.saveLocalMolecules([]);
        },
        init() {
            const molecules = this.getLocalMolecules();
            const editingMoleculeList = document.querySelector('.editing-mole-list');
            editingMoleculeList.innerHTML = '';
            
            molecules.forEach(async (molecule) => {
                const moleculeItem = await this.createMoleculeItem(molecule);
                editingMoleculeList.appendChild(moleculeItem);
            });
        }
    }
    editingMoleculeListManager.init(); 
    window.editingMoleculeListManager = editingMoleculeListManager;
    // 添加分子列表管理器
    const moleculeListManager = {
        async fetchUserMolecules() {
            try {
                const response = await apiService.getSaveMolecule();
                // if (response.total) {
                    this.renderMoleculeList(response.list);
                // }
            } catch (error) {
                console.error('获取用户分子列表失败:', error);
            }
        },

        renderMoleculeList(molecules) {
            const moleculeListContainer = document.querySelector('.saved-mole-list');
            if (!moleculeListContainer) return;
            if(molecules.length){
                moleculeListContainer.innerHTML = '';
                molecules.forEach(async molecule => {
                    const moleculeItem = await this.createMoleculeItem(molecule);
                    moleculeListContainer.appendChild(moleculeItem);
                });
            } else {
                moleculeListContainer.innerHTML = '<p class="empty-list">暂无保存的分子</p>';
            }
        },

        async createMoleculeItem(molecule) {
            let image_url = '/images/mole.png';
            try {
                const res = await apiService.getMoleculeImage({smiles_data: molecule.smiles, id: molecule.id});
                if (res && res.data && res.data.image_data) {
                    image_url = res.data.image_data;
                }
            } catch (error) {
                
            }
            const item = document.createElement('li');
            item.className = 'mole-item';
            item.innerHTML = `
                <div class="mole-icon-wrapper" style="padding: ${image_url!=='/images/mole.png' ? '0' : '8px'}">
                    <img style="border-radius: ${image_url=='/images/mole.png' ? '0' : '50%'}" src="${image_url}" alt="mole-icon" class="mole-icon">
                </div>
                <div class="mole-info">
                    <span class="mole-name">${molecule.display_name || '未命名分子'}</span>
                    <span class="mole-smiles">${molecule.smiles}</span>
                </div>
                <img src="/images/cancel.svg" alt="delete-icon" class="delete-icon">        
            `;

            // 添加事件监听
            this.addMoleculeItemListeners(item, molecule);
            return item;
        },

        addMoleculeItemListeners(item, molecule) {
            const deleteBtn = item.querySelector('.delete-icon');

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMolecule(molecule.id, item);
            });
            item.addEventListener('click', () => {
                document.querySelectorAll('.mole-item').forEach(el => {
                    el.classList.remove('active');
                });
                item.classList.add('active');
                this.loadMolecule(molecule);
                 // 检查是否在3D视图状态
                const is3DView = elements.btn3d.classList.contains('active');
                if (is3DView) {
                    setTimeout(() => {
                        // 在3D视图下，触发力场转换
                        unitMain.sendMessage('render-3d', '', '3d');
                    }, 500); // 可以根据实际情况调整延时时间
                }
            });
        },

        async loadMolecule(molecule) {
            // 调用 Ketcher 的方法加载分子
            unitMain.sendMessage('render2D', molecule.smiles, '2d');
            // 在PC端不回收侧边栏
            if (window.innerWidth <= 768) {
                elements.sidebar.style.width = "0";
            }
        },

        async deleteMolecule(moleculeId, item) {
            if (!confirm('确定要删除这个分子吗？')) return;

            try {
                const response = await apiService.deleteMolecule(moleculeId);
                if (response) {
                    item.remove();
                }
            } catch (error) {
                console.error('删除分子失败:', error);
            }
        }
    };
    // 添加用户状态管理
    const userManager = {
        setUserData(userData) {
            localStorage.setItem('userData', JSON.stringify(userData));
            this.updateUIWithUserData(userData);
            moleculeListManager.fetchUserMolecules();
        },

        clearUserData() {
            localStorage.removeItem('userData');
            this.updateUIWithUserData(null);
        },

        getUserData() {
            const userData = localStorage.getItem('userData');
            return userData ? JSON.parse(userData) : null;
        },

        updateUIWithUserData(userData) {
            const userInfoElement = elements.userInfo;
            if (userData) {
                userInfoElement.innerHTML = `
                    <img src="/images/user.svg" alt="user-icon" id="user-icon">
                    <span class="user-name">${userData.username}</span>
                    <img src="/images/exit.svg" alt="exit-icon" id="exit-icon" class="logout-btn">
                `;
                // 添加退出登录事件监听
                const logoutBtn = userInfoElement.querySelector('.logout-btn');
                logoutBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    this.handleLogout();
                });
                elements.userInfo.removeEventListener('click', () => {
                    elements.loginModalOverlay.style.display = 'flex';
                });
            } else {
                userInfoElement.innerHTML = `
                    <img src="/images/user.svg" alt="user-icon" id="user-icon">
                    <span class="user-name">请登录</span>
                `;
                // 点击用户信息，显示登录框
                elements.userInfo.addEventListener('click', () => {
                    console.log(123)
                    elements.loginModalOverlay.style.display = 'flex';
                });
            }
        },

        handleLogout() {
            this.clearUserData();
            const moleculeListContainer = document.querySelector('.saved-mole-list');
            moleculeListContainer.innerHTML = '<p class="empty-list">请登录后查看</p>';
            // 可以添加其他登出相关逻辑
        },

        // 初始化用户状态
        init() {
            const userData = this.getUserData();
            this.updateUIWithUserData(userData);
            if(userData){
                moleculeListManager.fetchUserMolecules();
            }else{
                const moleculeListContainer = document.querySelector('.saved-mole-list');
                moleculeListContainer.innerHTML = '<p class="empty-list">请登录后查看</p>';
            }
        }
    };
    userManager.init();
    const handleLogin = async () => {
        const username = elements.loginForm.querySelector('input[type="text"]').value;
        const passwd = elements.loginForm.querySelector('input[type="password"]').value;
        //  const agreement = elements.loginForm.querySelector('#agreement').checked;

        if (!username || !passwd) {
            alert('请输入账户和密码');
            return;
        }

        //  if (!agreement) {
        //      alert('请阅读并同意相关协议');
        //      return;
        //  }
        try {
            const response = await apiService.login({ username, passwd });
            console.log(response)
            userManager.setUserData(response);

            // // 关闭登录模态框
            elements.loginModalOverlay.style.display = 'none';

            // 清空表单
            // elements.loginForm.reset();
        } catch (error) {
            console.error('登录失败:', error);
            // alert(error.message) 
        }

    }
    const handleRegister = async () => {
        const username = elements.registerForm.querySelector('input[type="text"]').value;
        const email = elements.registerForm.querySelector('input[type="email"]').value;
        const passwd = elements.registerForm.querySelectorAll('input[type="password"]')[0].value;
        const confirmPasswd = elements.registerForm.querySelectorAll('input[type="password"]')[1].value;
        if(!username || !email || !passwd || !confirmPasswd){
            Toastify({
                text: "请输入完整信息",
                style: {
                    background: "#02ABB9",
                }
            }).showToast();
            return;
        }
        if(passwd !== confirmPasswd){
            Toastify({
                text: "两次密码不一致",
                style: {
                    background: "#02ABB9",
                }
            }).showToast();
            return;
        }
        try {
            const response = await apiService.register({ username, email, passwd });
            Toastify({
                text: response.data,
                style: {
                    background: "#02ABB9",
                }
            }).showToast();
            elements.loginModalOverlay.style.display = 'none';
        } catch (error) {
            console.error('注册失败:', error);
        }

    }
    // 切换登录方式
    elements.loginTab.forEach((tab,index) => {
        tab.addEventListener('click', () => {
            elements.loginTab.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            elements.formContainer.forEach(form => form.classList.remove('active'));
            elements.formContainer[index].classList.add('active');
        });
    });
    // 清除所有正在编辑的分子
    elements.clearAllBtn.addEventListener('click', (e) => {
        if (!confirm('确定要删除所有正在编辑的分子吗？')) return;
        e.stopPropagation();
        editingMoleculeListManager.clearAll();
    });
    // 注册按钮点击
    elements.registerBtn.addEventListener('click', () => {
        handleRegister();
    });
    // 登录按钮点击
    elements.loginBtn.addEventListener('click', () => {
        handleLogin();
    });
    // 登录框取消按钮
    elements.loginModalCancel.addEventListener('click', () => {
        elements.loginModalOverlay.style.display = 'none';
    });
    // 命名框保存按钮
    elements.nameModalSave.addEventListener('click', async () => {
        const display_name = elements.nameModalInput.value; 
        if(!display_name){
            Toastify({
                text: "请输入分子名称",
                style: {
                    background: "#02ABB9",
                }
            }).showToast();
            return;
        }
        const res = await apiService.saveMolecule({display_name, smiles: state.smiles});
        if(res.id){
            moleculeListManager.fetchUserMolecules();
            elements.nameModalOverlay.style.display = 'none';
        }
    });
    // 命名框取消按钮
    elements.nameModalCancel.addEventListener('click', () => {
        elements.nameModalOverlay.style.display = 'none';
    });
    // 3D视图按钮
    elements.btn3d.addEventListener('click', () => {
        elements.viewWrapper.classList.toggle('flipped');
        elements.btn3d.classList.toggle('active');
         // 如果切换到3D视图，立即触发力场转换
        if (elements.btn3d.classList.contains('active')) {
            // 获取最新的SDF数据并发送到3D应用
            // const latestSdfData = state.all_sdfData;
            // if (latestSdfData && latestSdfData.length > 0) {
                unitMain.sendMessage('render-3d', '', '3d');
            // }
        }
    })
    // 菜单按钮
    elements.menu.addEventListener('click', () => {
        if(elements.sidebar.style.width === "100%"){
            elements.sidebar.style.width = "0";
        }else{
            elements.sidebar.style.width = "100%";
        }
    })
    // 属性按钮
    elements.propertyBtn.addEventListener('click', () => {
        elements.moleFeatureBox.style.width = "100%";
    })
    // 属性取消按钮
    elements.molePropertyCancel.addEventListener('click', () => {
        elements.moleFeatureBox.style.width = "0";
    })
    unitMain.on('layoutOverForMain', () => {
        state.canFetch = true;
    })

    unitMain.on('startAIForMain', () => {
        state.isAICreated = true;
    })

    const sdfDataManager = {
        async updateSdfDataAndFetch(newSdfData) {
            const { addedOrModified, deleted } = this.processChanges(newSdfData);
            // 处理删除的分子
            this.handleDeletedMolecules(deleted);
            // 处理新增或修改的分子
            this.handleAddedOrModified(addedOrModified);
            // 发送请求
            if (addedOrModified.length > 0) {
                await this.fetchMoleProperties(addedOrModified);
            }
        },

        processChanges(newSdfData) {
            const addedOrModified = newSdfData.filter(newItem => {
                const existingItem = state.all_sdfData.find(oldItem => oldItem.id === newItem.id);
                return !existingItem || existingItem.originalString !== newItem.originalString;
            });

            const deleted = state.all_sdfData.filter(oldItem =>
                !newSdfData.find(newItem => newItem.id === oldItem.id)
            );

            return { addedOrModified, deleted };
        },

        handleDeletedMolecules(deleted) {
            deleted.forEach(deletedItem => {
                const index = state.all_sdfData.findIndex(item => item.id === deletedItem.id);
                if (index !== -1) {
                    state.all_sdfData.splice(index, 1);
                    state.moleFeatureArray.splice(index, 1);
                }
            });
        },

        handleAddedOrModified(addedOrModified) {
            addedOrModified.forEach(newItem => {
                const index = state.all_sdfData.findIndex(item => item.id === newItem.id);
                if (index !== -1) {
                    state.all_sdfData[index] = newItem;
                } else {
                    state.all_sdfData.push(newItem);
                    state.moleFeatureArray.push(null);
                }
            });
        },

        async fetchMoleProperties(dataToFetch) {
            for (const data of dataToFetch) {
                try {
                    const formData = this.createSdfFormData(data);
                    const result = await apiService.getMoleculeInfo(formData);

                    const index = state.all_sdfData.findIndex(item => item.id === data.id);
                    if (index !== -1) {
                        state.moleFeatureArray[index] = result.data;
                    }
                } catch (error) {
                    console.error("处理分子数据时发生错误:", error);
                }
            }
        },

        createSdfFormData(data) {
            const formData = new FormData();
            const blob = new Blob([data.originalString], { type: "chemical/x-mdl-sdfile" });
            const sdfFile = new File([blob], `molecule_${data.createdAt}.sdf`, { type: "chemical/x-mdl-sdfile" });
            formData.append("sdf_file", sdfFile);
            return formData;
        }
    };
    unitMain.on('getSDF', async (content) => {
        const new_sdfData = content.data;
        if (!state.isAICreated) {
            await sdfDataManager.updateSdfDataAndFetch(new_sdfData);
            updateUI();
        }
        if (state.canFetch && state.isAICreated) {
            await sdfDataManager.updateSdfDataAndFetch(new_sdfData)
            state.canFetch = false;
            updateUI();
        }
        if (elements.moleFeatureBox.dataset.visible === "true") {
            updateUI();
        }

        /*
            每一次ketcher上的分子变化，都会接收到getSDF的事件通信，然后就会更新new_sdfData中的数据，
            之后执行updateSdfDataAndFetch函数，这个函数会自动根据前后分子数据的id变化，来判断新增的分子，改变的分子，删除的分子，来避免重复发送请求的情况。
            在执行完  await updateSdfDataAndFetch(new_sdfData) 这条语句后，拿到的moleFeatureArray就是最新的请求返回的分子属性数据。
        */
    })
    console.log(marked)
    // 新增：更新分子论文的方法
    async function updateMoleculePapers(molecule, renderedIndex) {
        const papersContainer = document.getElementById('molecule-papers');
        papersContainer.innerHTML = ''; // 清空之前的内容
        try {
            let papers = await apiService.getPatentAndPapers(`${molecule.smiles}\n请查询并返回以上分子式相关的论文和专利`)
            papers = JSON.parse(papers)
            if(papers.answer){
                papersContainer.innerHTML = marked.parse(papers.answer)
            }else{
                papersContainer.innerHTML = '<p class="no-papers">没有可用的论文信息。</p>';
            }
        } catch (error) {
            console.error('获取论文失败:', error);
        }
    }

    // 统一更新UI
    function updateUI(selectedIndex = 0) {
        const tabContainer = document.querySelector('.tab-container');
        const moleculeContainer = document.getElementById('molecule-properties');
        const propertiesContainer = document.getElementById('properties-container');

        // 如果没有分子，清空内容区域但保留框架
        if (state.moleFeatureArray.length === 0) {
            propertiesContainer.style.display = 'none';
            tabContainer.innerHTML = '';
            moleculeContainer.innerHTML = '';
            return;
        }

        propertiesContainer.style.display = 'flex';
        renderTabs();
        // 如果选中的索引超出范围，则选择最后一个
        const validIndex = Math.min(selectedIndex, state.moleFeatureArray.length - 1);
        selectMolecule(validIndex);

        // 更新选中状态的样式
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach((tab, index) => {
            if (index === validIndex) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    function renderTabs() {
        const tabContainer = document.querySelector('.tab-container');
        tabContainer.innerHTML = '';
        if(state.moleFeatureArray.length > 1) {
            tabContainer.style.display = 'block';
        } else {
            tabContainer.style.display = 'none';
            return;
        }
        state.moleFeatureArray.forEach((molecule, index) => {
            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.innerText = `分子${index + 1}`;
            tab.onclick = () => {
                // 更新UI时传入点击的索引
                updateUI(index);
            };
            tabContainer.appendChild(tab);
        });
    }

    function selectMolecule(index) {
        const propertiesContainer = document.getElementById('molecule-properties');
        const molecule = state.moleFeatureArray[index];

        if (!molecule) {
            propertiesContainer.innerHTML = '';
            return;
        }

        propertiesContainer.innerHTML = `
            <div class="smiles-container">
                <strong>SMILES:</strong> 
                <span class="smiles-text" title="${molecule.smiles}">
                    ${molecule.smiles.length > 60 ? molecule.smiles.slice(0, 60) + '...' : molecule.smiles}
                </span>
            </div>
            <table class="property-table">
                <tr>
                    <th>属性</th>
                    <th>值</th>
                </tr>
                <tr>
                    <td>分子式</td>
                    <td>${molecule.molecular_formula}</td>
                </tr>
                <tr>
                    <td>分子量</td>
                    <td>${molecule.molecular_weight}</td>
                </tr>
                <tr>
                    <td>logP</td>
                    <td>${molecule.logP}</td>
                </tr>
                <tr>
                    <td>TPSA</td>
                    <td>${molecule.tpsa}</td>
                </tr>
                <tr>
                    <td>重原子数</td>
                    <td>${molecule.heavy_atoms}</td>
                </tr>
                <tr>
                    <td>环数</td>
                    <td>${molecule.num_rings}</td>
                </tr>
                <tr>
                    <td>可旋转键数</td>
                    <td>${molecule.rotatable_bonds}</td>
                </tr>
                <tr>
                    <td>氢键供体数</td>
                    <td>${molecule.num_h_donors}</td>
                </tr>
                <tr>
                    <td>氢键受体数</td>
                    <td>${molecule.num_h_acceptors}</td>
                </tr>
                <tr>
                    <td>QED评分</td>
                    <td>${molecule.qed_score}</td>
                </tr>
                <tr>
                    <td>形式电荷</td>
                    <td>${molecule.formal_charge}</td>
                </tr>
                <tr>
                    <td>溶解性</td>
                    <td>${molecule.solubility}</td>
                </tr>
                <tr>
                    <td>对称性</td>
                    <td>${molecule.symmetry}</td>
                </tr>
            </table>
        `;
        // 新增：更新分子论文
        updateMoleculePapers(molecule, index);
    }

    const moleHeaders = document.querySelectorAll('.mole-header');

    moleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
        });
    });
}
document.addEventListener('DOMContentLoaded', initApp);