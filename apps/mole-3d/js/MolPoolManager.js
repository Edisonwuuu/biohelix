class MolPoolManager {
    constructor(sha256) {
        this.dataPool = new Map();
        this.usedIds = new Set(); // 跟踪已使用的ID
        this.SHA256 = sha256;
    }

    // 用于解析SDF格式并提取原子坐标信息
    extractMoleculePosition(sdfData) {
        // 分割成行
        const lines = sdfData.split('\n');

        // 获取原子数量（在第四行，前3个字符）
        const atomCount = parseInt(lines[3].substring(0, 3));

        // 计算分子的中心位置
        let centerX = 0,
            centerY = 0,
            centerZ = 0;
        let atomPositions = [];

        // 从第5行开始是原子坐标（每行前30个字符包含xyz坐标）
        for (let i = 0; i < atomCount; i++) {
            const line = lines[i + 4];
            // SDF格式中，每个坐标占10个字符
            const x = parseFloat(line.substring(0, 10));
            const y = parseFloat(line.substring(10, 20));
            const z = parseFloat(line.substring(20, 30));

            atomPositions.push({
                x,
                y,
                z
            });
            centerX += x;
            centerY += y;
            centerZ += z;
        }

        // 计算中心点
        centerX /= atomCount;
        centerY /= atomCount;
        centerZ /= atomCount;

        // 计算分子的边界框
        let minX = Infinity,
            minY = Infinity,
            minZ = Infinity;
        let maxX = -Infinity,
            maxY = -Infinity,
            maxZ = -Infinity;

        atomPositions.forEach(pos => {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            minZ = Math.min(minZ, pos.z);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
            maxZ = Math.max(maxZ, pos.z);
        });

        return {
            center: {
                x: centerX,
                y: centerY,
                z: centerZ
            },
            boundingBox: {
                min: {
                    x: minX,
                    y: minY,
                    z: minZ
                },
                max: {
                    x: maxX,
                    y: maxY,
                    z: maxZ
                }
            },
            size: {
                x: maxX - minX,
                y: maxY - minY,
                z: maxZ - minZ
            },
            atomPositions: atomPositions
        };
    }

    // 处理单个字符串
    processString(str) {
        if (typeof str !== 'string') {
            throw new Error('输入必须是字符串类型');
        }
        const processedItem = {
            originalString: str,
            originalPosition: this.extractMoleculePosition(str),
            id: this.SHA256.hash(str),
            isChange: false,
            createdAt: new Date().toISOString()
        };
        return processedItem;
    }

    // 批量处理字符串数组
    processStrings(strArray) {
        if (!Array.isArray(strArray)) {
            throw new Error('输入必须是数组');
        }
        return strArray.map(str => this.processString(str));
    }

    // 添加到资源池
    addToPool(processedData) {
        if (Array.isArray(processedData)) {
            processedData.forEach(item => {
                this.dataPool.set(item.id, item);
            });
            return processedData.map(item => item.id); // 返回添加的所有ID
        } else {
            this.dataPool.set(processedData.id, processedData);
            return processedData.id; // 返回单个ID
        }
    }

    // 从资源池获取数据
    getFromPool(id) {
        return this.dataPool.get(id);
    }

    // 从资源池删除数据
    removeFromPool(items) {
        items.forEach(item => {
            const id = this.SHA256.hash(item);
            this.usedIds.delete(id);
            this.dataPool.delete(id);
        });
    }

    // 获取所有数据
    getAllData() {
        return Array.from(this.dataPool.values());
    }

    // 获取所有原始字符串
    getAllOriginalStrings() {
        return Array.from(this.dataPool.values())
            .map(item => item.originalString);
    }

    // 按字符串长度查找
    findByLength(length) {
        return Array.from(this.dataPool.values())
            .filter(item => item.length === length);
    }

    // 按字符串包含的内容查找
    findByContent(content) {
        return Array.from(this.dataPool.values())
            .filter(item => item.originalString.includes(content));
    }

    // 获取资源池大小
    getPoolSize() {
        return this.dataPool.size;
    }

    // 清空资源池
    clearPool() {
        this.dataPool.clear();
        this.usedIds.clear();
    }

    // 批量修改资源池中的数据
    updateInPool(ids, updateData) {
        if (!Array.isArray(ids) || !Array.isArray(updateData)) {
            throw new Error('ids 和 updateData 必须是数组');
        }

        if (ids.length !== updateData.length) {
            throw new Error('ids 和 updateData 数组的长度必须相同');
        }

        const updatedItems = [];

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const data = updateData[i];

            // 查找对应的项
            const item = this.dataPool.get(id);
            if (!item) {
                throw new Error(`ID ${id} 不存在于资源池中`);
            }

            // 更新数据
            if (data) {
                item.originalString = data;
                item.isChange = true;
                item.createdAt = new Date().toISOString(); // 更新创建时间
            }

            // 可根据需求添加其他属性的修改条件

            updatedItems.push(item);
        }

        // 返回更新后的项
        return updatedItems;
    }
}