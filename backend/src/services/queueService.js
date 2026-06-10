const logger = require('../utils/logger');

/**
 * Enterprise Background Job Queue Manager Stub.
 * Supports transitioning heavy CPU tasks (like Puppeteer PDF reports)
 * to background queues (BullMQ/Redis) without changing route invocation.
 */
class QueueService {
  constructor() {
    this.driver = process.env.QUEUE_DRIVER || 'sync';
    logger.info(`Queue service initialized with driver: ${this.driver}`);
  }

  /**
   * Enqueues a job for background processing.
   * @param {string} jobName - Name of the task.
   * @param {object} payload - Arguments to pass to the task.
   * @param {Function} processor - The task execution callback.
   * @returns {Promise<string>} The job identification reference.
   */
  async addJob(jobName, payload, processor) {
    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    logger.info(`Enqueuing background job`, { jobId, jobName, payload });

    if (this.driver === 'sync') {
      // Execute synchronously in development/fallback mode
      // Wrap in nextTick to avoid blocking the current execution chain
      process.nextTick(async () => {
        try {
          logger.info(`Executing background job (sync execution)`, { jobId });
          await processor(payload);
          logger.info(`Successfully completed background job`, { jobId });
        } catch (error) {
          logger.error(`Failed executing background job`, { jobId, error: error.message, stack: error.stack });
        }
      });
    } else {
      // In production (BullMQ/Redis), we would do:
      // const queue = new Queue(jobName, { connection: redisConnection });
      // await queue.add(jobId, payload);
      logger.warn(`BullMQ/Redis driver selected, but queue worker is currently in stub fallback mode.`);
    }

    return jobId;
  }
}

module.exports = new QueueService();
