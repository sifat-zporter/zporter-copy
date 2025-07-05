import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache, CachingConfig } from 'cache-manager';

@Injectable()
export class CacheManagerService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get(key: string) {
    return this.cacheManager.get(key);
  }

  async set(key: string, value: string, options?: CachingConfig) {
    return this.cacheManager.set(key, value, options);
  }

  async clear(key: string) {
    return this.cacheManager.del(key);
  }
}
