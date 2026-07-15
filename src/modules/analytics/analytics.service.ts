import { AnalyticsRepository } from './analytics.repository';
import { redisClient } from '../../config/redis';
import { logger } from '../../config/logger';

export class AnalyticsService {
  private analyticsRepository = new AnalyticsRepository();
  private CACHE_KEY = 'outlet_comparison_cache';
  private CACHE_EXPIRY = 300; // 5 minutes in seconds

  async getDailySummary(outletId: string, startDateStr?: string, endDateStr?: string) {
    const end = endDateStr ? new Date(endDateStr) : new Date();
    const start = startDateStr ? new Date(startDateStr) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // default 30 days
    return this.analyticsRepository.getDailySummaries(outletId, start, end);
  }

  async getBestWorstSellers(outletId: string) {
    return this.analyticsRepository.getBestWorstSellers(outletId);
  }

  async getOutletComparison() {
    try {
      if (redisClient.isOpen) {
        const cachedData = await redisClient.get(this.CACHE_KEY);
        if (cachedData) {
          logger.info('Serving outlet comparison from Redis cache');
          return JSON.parse(cachedData);
        }
      }
    } catch (error) {
      logger.error('Redis cache fetch failed, querying database directly:', error);
    }

    // Query database as fallback
    const comparison = await this.analyticsRepository.getOutletComparison();

    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(this.CACHE_KEY, this.CACHE_EXPIRY, JSON.stringify(comparison));
        logger.info('Saved outlet comparison to Redis cache');
      }
    } catch (error) {
      logger.error('Failed to save outlet comparison cache to Redis:', error);
    }

    return comparison;
  }

  async getReports(outletId: string, startDateStr?: string, endDateStr?: string) {
    const end = endDateStr ? new Date(endDateStr) : new Date();
    const start = startDateStr ? new Date(startDateStr) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return this.analyticsRepository.getReports(outletId, start, end);
  }
}
export default AnalyticsService;
