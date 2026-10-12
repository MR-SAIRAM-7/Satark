/**
 * Campaign grouping for the police dashboard. Reports join one campaign when
 * they share an indicator (same number, UPI ID or domain), or when their
 * masked texts are near-duplicates: DBSCAN over the classifier's TF-IDF
 * vectors with cosine distance, within each scam type.
 */
import { SCAM_TYPES, type ScamType } from '@satark/shared';
import clustering from 'density-clustering';

import { Campaign, Ioc, Report } from '../db/models';
import { classifier } from './ml/classifier';
import { featureText } from './ml/features';

const WINDOW_DAYS = 14;
const MIN_REPORTS = 3;
const EPSILON = 0.45;

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, v] of small) dot += v * (large.get(k) ?? 0);
  return dot;
}

const mode = <T>(items: T[]): T | undefined => {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
};

export async function clusterCampaigns(now = new Date()): Promise<number> {
  const reports = await Report.find({ createdAt: { $gte: new Date(now.getTime() - WINDOW_DAYS * 86_400_000) } })
    .select('scamType locality iocs maskedText createdAt')
    .sort({ createdAt: 1 })
    .lean();

  // Union-find over report indexes.
  const parent = reports.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const union = (a: number, b: number) => (parent[find(a)] = find(b));

  // Shared indicators.
  const byIoc = new Map<string, number[]>();
  reports.forEach((r, i) => r.iocs.forEach((id) => byIoc.set(String(id), [...(byIoc.get(String(id)) ?? []), i])));
  for (const members of byIoc.values()) members.slice(1).forEach((m) => union(members[0]!, m));

  // Near-duplicate texts within a scam type.
  const byType = new Map<string, number[]>();
  reports.forEach((r, i) => r.maskedText && byType.set(r.scamType, [...(byType.get(r.scamType) ?? []), i]));
  for (const members of byType.values()) {
    if (members.length < 2) continue;
    const vectors = members.map((i) => classifier().vector(featureText(reports[i]!.maskedText!)));
    const groups = new clustering.DBSCAN().run(
      members.map((_, n) => [n]),
      EPSILON,
      2,
      (a, b) => 1 - cosine(vectors[a[0]!]!, vectors[b[0]!]!),
    );
    for (const group of groups) group.slice(1).forEach((n) => union(members[group[0]!]!, members[n]!));
  }

  const components = new Map<number, number[]>();
  reports.forEach((_, i) => components.set(find(i), [...(components.get(find(i)) ?? []), i]));

  const keys: string[] = [];
  for (const members of components.values()) {
    if (members.length < MIN_REPORTS) continue;
    const rs = members.map((i) => reports[i]!);
    const scamType = (mode(rs.map((r) => r.scamType)) ?? 'unknown') as ScamType;
    const localities = [...new Set(rs.map((r) => r.locality).filter(Boolean))] as string[];
    const topLocality = mode(rs.map((r) => r.locality).filter(Boolean)) ?? 'Hyderabad';
    const iocIds = [...new Set(rs.flatMap((r) => r.iocs.map(String)))];
    const topIoc = iocIds.length ? await Ioc.findOne({ _id: { $in: iocIds } }).sort({ reportCount: -1 }).lean() : null;
    const key = `${scamType}:${rs[0]!._id}`;
    keys.push(key);

    const campaign = await Campaign.findOneAndUpdate(
      { key },
      {
        label: `${SCAM_TYPES[scamType].label.en} · ${topLocality}${topIoc ? ` · ${topIoc.masked}` : ''}`,
        scamType,
        reportCount: rs.length,
        localities: localities.slice(0, 6),
        iocCount: iocIds.length,
        sampleText: rs.find((r) => r.maskedText)?.maskedText?.slice(0, 280),
        firstSeen: rs[0]!.createdAt,
        lastSeen: rs.at(-1)!.createdAt,
        active: true,
      },
      { upsert: true, returnDocument: 'after' },
    );
    await Report.updateMany({ _id: { $in: rs.map((r) => r._id) } }, { campaign: campaign._id });
    if (iocIds.length) await Ioc.updateMany({ _id: { $in: iocIds } }, { campaign: campaign._id });
  }
  await Campaign.updateMany({ key: { $nin: keys } }, { active: false });
  return keys.length;
}
