class SHA256 {
    static hash(message) {
        // SHA-256 初始哈希值 (前8个质数的平方根的前32位小数部分)
        const H = [
            0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
            0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
        ];

        // SHA-256 常量 (前64个质数的立方根的前32位小数部分)
        const K = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];

        // 辅助函数
        const ROTR = (n, x) => (x >>> n) | (x << (32 - n));
        const Ch = (x, y, z) => (x & y) ^ (~x & z);
        const Maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
        const Σ0 = x => ROTR(2, x) ^ ROTR(13, x) ^ ROTR(22, x);
        const Σ1 = x => ROTR(6, x) ^ ROTR(11, x) ^ ROTR(25, x);
        const σ0 = x => ROTR(7, x) ^ ROTR(18, x) ^ (x >>> 3);
        const σ1 = x => ROTR(17, x) ^ ROTR(19, x) ^ (x >>> 10);

        // 将消息转换为字节数组并添加填充
        const bytes = [];
        for (let i = 0; i < message.length; i++) {
            bytes.push(message.charCodeAt(i) & 0xFF);
        }

        const l = bytes.length * 8;
        bytes.push(0x80);
        while ((bytes.length * 8 + 64) % 512 !== 0) {
            bytes.push(0x00);
        }

        // 添加消息长度（64位）
        for (let i = 0; i < 8; i++) {
            bytes.push((l >>> ((7 - i) * 8)) & 0xFF);
        }

        // 处理消息块
        const blocks = [];
        for (let i = 0; i < bytes.length; i += 64) {
            const block = new Uint32Array(16);
            for (let j = 0; j < 16; j++) {
                block[j] = (bytes[i + j * 4] << 24) |
                    (bytes[i + j * 4 + 1] << 16) |
                    (bytes[i + j * 4 + 2] << 8) |
                    (bytes[i + j * 4 + 3]);
            }
            blocks.push(block);
        }

        // 主循环
        const hash = H.slice();
        for (const block of blocks) {
            const W = new Uint32Array(64);
            for (let t = 0; t < 16; t++) {
                W[t] = block[t];
            }
            for (let t = 16; t < 64; t++) {
                W[t] = (σ1(W[t - 2]) + W[t - 7] + σ0(W[t - 15]) + W[t - 16]) >>> 0;
            }

            let [a, b, c, d, e, f, g, h] = hash;

            for (let t = 0; t < 64; t++) {
                const T1 = (h + Σ1(e) + Ch(e, f, g) + K[t] + W[t]) >>> 0;
                const T2 = (Σ0(a) + Maj(a, b, c)) >>> 0;
                h = g;
                g = f;
                f = e;
                e = (d + T1) >>> 0;
                d = c;
                c = b;
                b = a;
                a = (T1 + T2) >>> 0;
            }

            hash[0] = (hash[0] + a) >>> 0;
            hash[1] = (hash[1] + b) >>> 0;
            hash[2] = (hash[2] + c) >>> 0;
            hash[3] = (hash[3] + d) >>> 0;
            hash[4] = (hash[4] + e) >>> 0;
            hash[5] = (hash[5] + f) >>> 0;
            hash[6] = (hash[6] + g) >>> 0;
            hash[7] = (hash[7] + h) >>> 0;
        }

        // 将结果转换为十六进制字符串
        return hash.map(h => h.toString(16).padStart(8, '0')).join('');
    }
}