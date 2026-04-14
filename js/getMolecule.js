/**
 * 获取分子列表的查询函数
 * @param {Object} params - 查询参数对象，支持name, info, smiles, inchi
 * @returns {Promise} - 返回 Promise 对象，包含请求结果
 */
// 根据当前的域设置不同的baseUrl
const baseUrl = window.location.hostname === 'moleditor.com' ? 'https://moleditor.com' : 'http://140.143.189.81:3300';
function getMolecularList(params = {}) {
    const url = `${baseUrl}/api/molecular`;

    // 使用 URLSearchParams 构建查询字符串
    const queryString = new URLSearchParams({
        self: params.self || '',
        pubchem_id: params.pubchem_id || '',
        kwd: params.kwd || undefined,
        offset: params.offset || '',
    }).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    return fetch(fullUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => data)
        .catch(error => {
            console.error("Error fetching molecular list:", error);
            throw error;
        });
}

/**
 * 获取单个分子数据的查询函数
 * @param {string} id - 分子 ID
 * @returns {Promise} - 返回 Promise 对象，包含请求结果
 */
function getMolecularById(id) {
    const url = `${baseUrl}/api/molecular/pubchem_${id}`;

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok for molecular ID: ${id}`);
            }
            return response.json();
        })
        .then(data => data)
        .catch(error => {
            console.error(`Error fetching molecular with ID ${id}:`, error);
            throw error;
        });
}