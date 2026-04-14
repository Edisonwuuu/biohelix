const API_BASE_URL = 'https://moleditor.com';

const getToken = () => {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData).token : null;
}

// 添加响应处理函数
const handleResponse = async (response) => {
    if (response.status === 401) {
        localStorage.clear();
        Toastify(
            {
                text: '请先登录'
            }
        ).showToast();
        return;
        // throw new Error('请先登录');
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error || `HTTP error! status: ${response.status}`);
    }
     // 获取 Content-Type 头
     const contentType = response.headers.get('Content-Type');
     // 根据 Content-Type 决定如何处理响应
     if (contentType && contentType.includes('application/json')) {
         return response.json();
     } else {
         return response.text();
     }
};

// 封装fetch请求
const request = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            ...options,
            headers: { 
                'Authorization': `${getToken()}`,
                ...options.headers
            }
        });
        return await handleResponse(response);
    } catch (error) {
        if(url.includes('molecule/getimage')){
            return;
        }
        Toastify(
            {
                text: error.message,
                style: {
                    background: "#f44336",
                },
            }
        ).showToast();
    }
};

const apiService = {
    async login(data) {
        const response = await request(`${API_BASE_URL}/auth/user-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response;
    },
    async register(data) {
        const response = await request(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return response;
    },
    async getMoleculeInfo(formData) {
        const response = await request(`${API_BASE_URL}:3003/api/molecule/druginfo`, {
            method: 'POST',
            body: formData,
        });
        return response;
    },
    async getMoleculeImage(data) {
        const response = await request(`${API_BASE_URL}:3003/api/molecule/getimage?id=${data.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ smiles_data: data.smiles_data }),
        });
        return response;
    },
    async getPatentAndPapers(data) {
        const response = await request(`${API_BASE_URL}/ai/patent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: data, response_mode: 'blocking' }),
        });
        return response;
    },
    async saveMolecule(moleculeData) {
        const response = await request(`${API_BASE_URL}/api/molecular`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(moleculeData)
        });
        return response;
    },
    async getSaveMolecule(offset = 0) {
        const response = await request(`${API_BASE_URL}/api/molecular?self=true&offset=${offset}`);
        return response;
    },
    async deleteMolecule(id) {
        const response = await request(`${API_BASE_URL}/api/molecular/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });
        return response;
    },
    async uploadImage(formData) {
        const response = await request(`${API_BASE_URL}/ai/image`, {
            method: 'POST',
            body: formData
        });
        return response;
    },
    async stopAI(conversation_id) {
        const response = await request(`${API_BASE_URL}/ai/chat/${conversation_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action:'stop' })
        });
        return response;
    },
    // async sendMessageToAI(data, signal) {
    //     const response = await request(`${API_BASE_URL}/ai/chat`, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify(data),
    //         signal: signal
    //     });
    //     return response;
    // }
    async sendMessageToAI(data, signal) {
        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            signal: signal
        });
        return response;
    }

};