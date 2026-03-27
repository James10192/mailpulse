---
description: Cloudflare R2 + Neon integration patterns for file storage with metadata
globs: ["**/r2*", "**/upload*", "**/storage*", "**/presign*"]
---

# Cloudflare R2 + Neon Integration

## Architecture Pattern
- **R2** = file storage (images, CSVs, email assets)
- **Neon/Prisma** = structured metadata (object key, URL, user ID, timestamps)
- **Presigned URLs** = clients upload directly to R2, no backend proxy needed

## Upload Flow
1. Backend generates presigned upload URL via `@aws-sdk/s3-request-presigner`
2. Client uploads file directly to R2 using the presigned URL
3. Backend saves file metadata (object_key, file_url, user_id) to Neon via Prisma
4. Application queries Prisma for file references when needed

## Key Implementation Points

### Presigned Upload URL
```typescript
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const command = new PutObjectCommand({
  Bucket: process.env.CLOUDFLARE_R2_BUCKET,
  Key: `uploads/${Date.now()}-${fileName}`,
  ContentType: contentType,
});
const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
```

### CORS Configuration for R2 Bucket
Must configure CORS on the bucket for browser uploads:
```json
{
  "AllowedOrigins": ["https://your-app.com", "http://localhost:3000"],
  "AllowedMethods": ["PUT", "GET"]
}
```

### Best Practices
- Validate `fileName` and `contentType` server-side before generating presigned URLs
- Store only `object_key` in Prisma for private buckets; generate read URLs on-demand
- Use presigned READ URLs for private files instead of public bucket access
- Use global R2 client instance (singleton pattern like Prisma)
- Presigned URL expiration: 300s for uploads, 3600s for downloads
- Include file size validation (reject > max size before upload)
- Implement cleanup: delete R2 objects when Prisma records are deleted

### Security
- Replace placeholder auth with Better Auth session validation
- Validate file types (whitelist allowed MIME types)
- Use unique object keys to prevent overwrites (`${Date.now()}-${uuid}`)
- Never expose R2 Secret Access Key to client
