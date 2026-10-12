/**
 * Background automation (node-cron). Each job is idempotent: it records what it
 * has done (reminder tags, escalation counts) so a restart never repeats a message.
 */
import cron, { type ScheduledTask } from 'node-cron';

import { env } from '../config/env';
import { FeedEvent, Ioc } from '../db/models';
import { logger } from '../lib/logger';
import { escalateUnacknowledged } from '../services/alerts';
import { clusterCampaigns } from '../services/campaigns';
import { goldenHourReminders, staleCaseFollowUps } from '../services/complaints';
import { startLiveFeed, stopLiveFeed } from './liveFeed';

const tasks: ScheduledTask[] = [];

/** Suspected indicators nobody has reported for 30 days are dropped; confirmed ones stay. */
export async function decayIocs(now = new Date()): Promise<number> {
  const { deletedCount } = await Ioc.deleteMany({ status: 'suspected', lastSeen: { $lt: new Date(now.getTime() - 30 * 86_400_000) } });
  return deletedCount;
}

/** Keep the dashboard feed to its most recent 2,000 events. */
export async function trimFeed(): Promise<number> {
  const keep = await FeedEvent.find().sort({ createdAt: -1 }).skip(2000).limit(1).select('createdAt').lean();
  if (!keep[0]) return 0;
  const { deletedCount } = await FeedEvent.deleteMany({ createdAt: { $lte: keep[0].createdAt } });
  return deletedCount;
}

export const JOBS: { name: string; schedule: string; run: () => Promise<number> }[] = [
  { name: 'alerts.escalate', schedule: '*/30 * * * * *', run: () => escalateUnacknowledged() },
  { name: 'cases.golden-hour-reminders', schedule: '*/30 * * * * *', run: () => goldenHourReminders() },
  { name: 'campaigns.cluster', schedule: '*/10 * * * *', run: () => clusterCampaigns() },
  { name: 'cases.follow-up', schedule: '0 */6 * * *', run: () => staleCaseFollowUps() },
  { name: 'intel.decay', schedule: '30 3 * * *', run: () => decayIocs() },
  { name: 'feed.trim', schedule: '15 * * * *', run: () => trimFeed() },
];

export function startJobs(): void {
  if (!env.JOBS_ENABLED) return;
  for (const job of JOBS) {
    tasks.push(
      cron.schedule(
        job.schedule,
        async () => {
          try {
            const count = await job.run();
            if (count) logger.info({ job: job.name, count }, 'job ran');
          } catch (err) {
            logger.error({ job: job.name, err }, 'job failed');
          }
        },
        { name: job.name, noOverlap: true },
      ),
    );
  }
  if (env.LIVE_FEED) startLiveFeed();
  logger.info({ jobs: JOBS.map((j) => j.name) }, 'automation scheduled');
}

export async function stopJobs(): Promise<void> {
  stopLiveFeed();
  await Promise.all(tasks.splice(0).map((t) => t.destroy()));
}
