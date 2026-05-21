const Redis = require('ioredis');

// Try to connect to Redis, but don't crash if not available
let redis = null;
let useMock = true; // Start with mock mode

try {
    redis = new Redis({
        host: 'localhost',
        port: 6379,
        retryStrategy: () => null  // Don't retry, just fail fast
    });
    
    redis.on('error', (err) => {
        console.log('⚠️ Redis not available, using in-memory fallback');
        useMock = true;
    });
    
    // If connection succeeds after a short delay, switch to real Redis
    setTimeout(() => {
        if (redis && redis.status === 'ready') {
            console.log('✅ Redis connected successfully!');
            useMock = false;
        }
    }, 1000);
} catch (error) {
    console.log('⚠️ Redis not available, using in-memory fallback');
    useMock = true;
}

// In-memory fallback (works without Redis installed)
const memoryStore = new Map();

// Wrapper that works with or without Redis
const redisClient = {
    async set(key, value, expSeconds) {
        if (!useMock && redis && redis.status === 'ready') {
            await redis.set(key, String(value), 'EX', expSeconds);
        } else {
            memoryStore.set(key, { value: String(value), expires: Date.now() + (expSeconds * 1000) });
        }
    },
    
    async get(key) {
        if (!useMock && redis && redis.status === 'ready') {
            return await redis.get(key);
        } else {
            const data = memoryStore.get(key);
            if (!data) return null;
            if (data.expires < Date.now()) {
                memoryStore.delete(key);
                return null;
            }
            return data.value;
        }
    },
    
    async incr(key) {
        if (!useMock && redis && redis.status === 'ready') {
            return await redis.incr(key);
        } else {
            const current = await this.get(key);
            const newValue = (parseInt(current) || 0) + 1;
            await this.set(key, newValue, 60);
            return newValue;
        }
    },
    
    async expire(key, seconds) {
        if (!useMock && redis && redis.status === 'ready') {
            await redis.expire(key, seconds);
        } else {
            const data = memoryStore.get(key);
            if (data) {
                data.expires = Date.now() + (seconds * 1000);
                memoryStore.set(key, data);
            }
        }
    },
    
    async ttl(key) {
        if (!useMock && redis && redis.status === 'ready') {
            return await redis.ttl(key);
        } else {
            const data = memoryStore.get(key);
            if (!data) return -2;
            const remaining = Math.ceil((data.expires - Date.now()) / 1000);
            return remaining > 0 ? remaining : -2;
        }
    },
    
    async del(key) {
        if (!useMock && redis && redis.status === 'ready') {
            await redis.del(key);
        } else {
            memoryStore.delete(key);
        }
    }
};

module.exports = redisClient;