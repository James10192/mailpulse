import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 5MB)" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Type de fichier non supporte" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const key = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const bucket = process.env.CLOUDFLARE_R2_BUCKET!;

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(bytes),
        ContentType: file.type,
      })
    );

    // Build URL — use public URL if configured, otherwise use endpoint + bucket + key
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
    const url = publicUrl
      ? `${publicUrl}/${key}`
      : `${process.env.CLOUDFLARE_R2_ENDPOINT}/${bucket}/${key}`;

    return NextResponse.json({ url });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'upload. Verifiez la configuration R2." },
      { status: 500 }
    );
  }
}
