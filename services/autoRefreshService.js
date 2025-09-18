class AutoRefreshService {
  constructor(chatbotService) {
    this.chatbotService = chatbotService;
    this.refreshInterval = 1 * 60 * 1000; // 1 minute
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Start auto refresh service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Auto refresh service is already running');
      return;
    }

    console.log('🔄 Starting auto refresh service...');
    this.isRunning = true;

    // Initial refresh
    this.refreshData();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.refreshData();
    }, this.refreshInterval);

    console.log(`✅ Auto refresh service started (every ${this.refreshInterval / 1000} seconds)`);
  }

  /**
   * Stop auto refresh service
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Auto refresh service is not running');
      return;
    }

    console.log('🛑 Stopping auto refresh service...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Auto refresh service stopped');
  }

  /**
   * Refresh data manually
   */
  async refreshData() {
    try {
      console.log('🔄 Auto refreshing data...');
      await this.chatbotService.refreshData();
      console.log('✅ Auto refresh completed');
    } catch (error) {
      console.error('❌ Error during auto refresh:', error);
    }
  }

  /**
   * Force refresh data immediately
   */
  async forceRefresh() {
    console.log('🔄 Force refreshing data...');
    await this.refreshData();
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      refreshInterval: this.refreshInterval,
      nextRefresh: this.isRunning ? new Date(Date.now() + this.refreshInterval) : null
    };
  }

  /**
   * Update refresh interval
   * @param {number} interval - New interval in milliseconds
   */
  updateInterval(interval) {
    if (interval < 60000) { // Minimum 1 minute
      console.warn('⚠️ Refresh interval too short, using minimum 1 minute');
      interval = 60000;
    }

    this.refreshInterval = interval;
    console.log(`🔄 Refresh interval updated to ${interval / 1000} seconds`);

    // Restart service if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

module.exports = { AutoRefreshService };
