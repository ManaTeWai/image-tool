import { NextRequest } from "next/server";
import sharp from "sharp";
import archiver from "archiver";
import { PassThrough } from "stream";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const files = formData.getAll("files") as File[];
    if (!files.length) {
      return new Response("No files", { status: 400 });
    }

    const width = Number(formData.get("width")) || undefined;
    const height = Number(formData.get("height")) || undefined;
    const format = (formData.get("format") as string) || "jpeg";
    const stripMeta = formData.get("stripMeta") === "true";

    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = new PassThrough();
    archive.pipe(stream);

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());

      let img = sharp(buffer);

      if (width || height) {
        img = img.resize({
          width: width || undefined,
          height: height || undefined,
          fit: "inside",
        });
      }

      if (stripMeta) img = img.withMetadata(false);

      switch (format) {
        case "png":
          img = img.png();
          break;
        case "webp":
          img = img.webp({ quality: 90 });
          break;
        default:
          img = img.jpeg({ quality: 90 });
      }

      const out = await img.toBuffer();

      const base = file.name.replace(/\.\w+$/, "");
      archive.append(out, { name: `${base}.${format}` });
    }

    archive.finalize();

    return new Response(stream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="images.zip"',
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Failed", { status: 500 });
  }
}