// Auto-ping utility to keep Supabase project active
// Prevents auto-pause after 7 days of inactivity

import { supabase } from '@/lib/supabase';

export class SupabasePing {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 6 * 24 * 60 * 60 * 1000; // 6 days in milliseconds
  private readonly STORAGE_KEY = 'supabase_last_ping';

  /**
   * Simple ping function to generate database activity
   */
  private async ping(): Promise<boolean> {
    try {
      console.log('🏓 Pinging Supabase to keep project active...');

      // Simple query to generate activity - just get one record
      const { data, error } = await supabase
        .from('assets')
        .select('id')
        .limit(1);

      if (error) {
        console.warn('⚠️ Supabase ping failed:', error.message);
        return false;
      }

      // Store last ping timestamp
      localStorage.setItem(this.STORAGE_KEY, new Date().toISOString());
      console.log('✅ Supabase ping successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase ping error:', error);
      return false;
    }
  }

  /**
   * Check if we need to ping based on last ping time
   */
  private shouldPing(): boolean {
    try {
      const lastPing = localStorage.getItem(this.STORAGE_KEY);
      if (!lastPing) return true;

      const lastPingTime = new Date(lastPing).getTime();
      const now = Date.now();
      const timeSinceLastPing = now - lastPingTime;

      // Ping if it's been more than 5 days since last ping
      return timeSinceLastPing > (5 * 24 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Error checking last ping time:', error);
      return true; // Ping if we can't determine last ping time
    }
  }

  /**
   * Start the auto-ping interval
   */
  public start(): void {
    // Don't start multiple intervals
    if (this.intervalId) return;

    console.log('🚀 Starting Supabase auto-ping (every 6 days)');

    // Do an initial ping if needed
    if (this.shouldPing()) {
      this.ping();
    }

    // Set up recurring ping
    this.intervalId = setInterval(() => {
      if (this.shouldPing()) {
        this.ping();
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Stop the auto-ping interval
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Stopped Supabase auto-ping');
    }
  }

  /**
   * Manual ping for testing
   */
  public async manualPing(): Promise<boolean> {
    return await this.ping();
  }

  /**
   * Get last ping information
   */
  public getLastPingInfo(): { lastPing: string | null; daysSinceLastPing: number } {
    try {
      const lastPing = localStorage.getItem(this.STORAGE_KEY);
      if (!lastPing) {
        return { lastPing: null, daysSinceLastPing: -1 };
      }

      const lastPingTime = new Date(lastPing).getTime();
      const now = Date.now();
      const daysSinceLastPing = Math.floor((now - lastPingTime) / (24 * 60 * 60 * 1000));

      return { lastPing, daysSinceLastPing };
    } catch (error) {
      return { lastPing: null, daysSinceLastPing: -1 };
    }
  }
}

// Export singleton instance
export const supabasePing = new SupabasePing();