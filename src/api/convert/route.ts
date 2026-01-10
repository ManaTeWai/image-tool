import { NextRequest } from "next/server";
import sharp from "sharp";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const rawFiles = formData.getAll("files");
    const files = rawFiles.filter((f): f is File =>
      typeof (f as { arrayBuffer?: unknown }).arrayBuffer === "function"
    );
    if (!files.length) {
      return new Response("No files", { status: 400 });
    }

    const width = Number(formData.get("width")) || undefined;
    const height = Number(formData.get("height")) || undefined;

    const formatRaw = formData.get("format");
    let format = typeof formatRaw === "string" ? formatRaw.toLowerCase() : "jpeg";
    if (format === "jpg") format = "jpeg";
    const allowedFormats = ["jpeg", "png", "webp"];
    if (!allowedFormats.includes(format)) {
      return new Response("Invalid format", { status: 400 });
    }

    const stripMeta = formData.get("stripMeta") === "true";

    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = new PassThrough();
    archive.pipe(stream);

    archive.on("error", (err: unknown) => {
      console.error("Archive error:", err);
      try {
        archive.abort();
      } catch {
        // ignore
      }
      stream.destroy(err as Error);
    });

    stream.on("error", (err) => {
      console.error("Stream error:", err);
    });

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

      if (!stripMeta) img = img.withMetadata();

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

    const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

    return new Response(webStream, {
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