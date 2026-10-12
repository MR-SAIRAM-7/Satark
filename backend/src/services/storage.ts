/**
 * Complaint Kit storage. AWS S3 with presigned URLs when configured; otherwise
 * local disk (backend/.data/files) behind HMAC-signed links that expire the
 * same way (about 10 minutes), served by GET /v1/files/*.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve } from 'node:path';

import { env, features } from '../config/env';
import { signPath } from '../lib/crypto';

const LOCAL_ROOT = resolve(process.cwd(), '.data', 'files');
export const LINK_TTL_SECONDS = 600;

const s3 = features.s3
  ? import('@aws-sdk/client-s3').then(({ S3Client }) => new S3Client({ region: env.AWS_REGION }))
  : null;

function localPath(key: string): string {
  const path = normalize(join(LOCAL_ROOT, key));
  if (!path.startsWith(LOCAL_ROOT)) throw new Error('Invalid file key');
  return path;
}

export async function putFile(key: string, body: Buffer, contentType: string): Promise<void> {
  if (s3) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await (await s3).send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  const path = localPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}

export async function fileUrl(key: string, ttlSeconds = LINK_TTL_SECONDS): Promise<string> {
  if (s3) {
    const [{ GetObjectCommand }, { getSignedUrl }] = await Promise.all([
      import('@aws-sdk/client-s3'),
      import('@aws-sdk/s3-request-presigner'),
    ]);
    return getSignedUrl(await s3, new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), { expiresIn: ttlSeconds });
  }
  const expires = Date.now() + ttlSeconds * 1000;
  return `${env.PUBLIC_BASE_URL}/v1/files/${key}?exp=${expires}&sig=${signPath(key, expires)}`;
}

export const readLocalFile = (key: string) => readFile(localPath(key));
