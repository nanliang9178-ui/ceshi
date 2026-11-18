import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

interface MemoryItem {
  value: string;
  expireAt: number;
}

/**
 * 缓存 + 轻量分布式锁
 * - 配置 REDIS_URL 时使用 Redis（多实例部署）
 * - 未配置时自动降级为进程内缓存（单机部署完全够用）
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, MemoryItem>();
  private redis: Redis | null = null;

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      this.redis = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: false });
      this.redis.on('error', (err) => this.logger.warn(`Redis 连接异常，已降级为内存缓存: ${err.message}`));
      this.redis.on('ready', () => this.logger.log('Redis 已连接'));
    } else {
      this.logger.log('未配置 REDIS_URL，使用进程内缓存');
    }
    // 定期清理过期键
    setInterval(() => this.sweep(), 60_000).unref?.();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit().catch(() => undefined);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, item] of this.memory) {
      if (item.expireAt <= now) this.memory.delete(key);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (this.redis && this.redis.status === 'ready') {
      const raw = await this.redis.get(key).catch(() => null);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const item = this.memory.get(key);
    if (!item) return null;
    if (item.expireAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(item.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.redis && this.redis.status === 'ready') {
      await this.redis.set(key, raw, 'EX', ttlSeconds).catch(() => undefined);
      return;
    }
    this.memory.set(key, { value: raw, expireAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(...keys: string[]): Promise<void> {
    if (!keys.length) return;
    if (this.redis && this.redis.status === 'ready') {
      await this.redis.del(...keys).catch(() => undefined);
      return;
    }
    keys.forEach((k) => this.memory.delete(k));
  }

  /** 按前缀清理（菜单变更时失效聚合缓存） */
  async delByPrefix(prefix: string): Promise<void> {
    if (this.redis && this.redis.status === 'ready') {
      const keys = await this.redis.keys(`${prefix}*`).catch(() => [] as string[]);
      if (keys.length) await this.redis.del(...keys).catch(() => undefined);
      return;
    }
    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) this.memory.delete(key);
    }
  }

  async incr(key: string, ttlSeconds = 86400): Promise<number> {
    if (this.redis && this.redis.status === 'ready') {
      const value = await this.redis.incr(key);
      if (value === 1) await this.redis.expire(key, ttlSeconds);
      return value;
    }
    const item = this.memory.get(key);
    const current = item && item.expireAt > Date.now() ? Number(item.value) : 0;
    const next = current + 1;
    this.memory.set(key, { value: String(next), expireAt: Date.now() + ttlSeconds * 1000 });
    return next;
  }

  /**
   * 抢占式锁（用于下单幂等、支付回调去重）
   * 返回 true 表示获取成功
   */
  async acquireLock(key: string, ttlSeconds = 30): Promise<boolean> {
    if (this.redis && this.redis.status === 'ready') {
      const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX').catch(() => null);
      return result === 'OK';
    }
    const item = this.memory.get(key);
    if (item && item.expireAt > Date.now()) return false;
    this.memory.set(key, { value: '1', expireAt: Date.now() + ttlSeconds * 1000 });
    return true;
  }
}
