import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import sharp from "sharp";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";

const app = new Hono();
app.use("*", cors());

const MIME: Record<string, string> = {
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
};

app.get("/healthz", (c) => c.text("ok"));

app.post("/convert", async (c) => {
	const formData = await c.req.formData();

	const rawFiles = formData.getAll("files");
	const files = rawFiles.filter(
		(f): f is File => typeof (f as any)?.arrayBuffer === "function"
	);
	if (!files.length) return c.text("No files uploaded", 400);

	const width = Number(formData.get("width")) || undefined;
	const height = Number(formData.get("height")) || undefined;
	const keepAspect = formData.get("keepAspect") !== "0";
	const stripMeta = formData.get("stripMeta") === "true";

	let format = String(formData.get("format") || "jpeg").toLowerCase();
	if (format === "jpg") format = "jpeg";
	if (!["jpeg", "png", "webp"].includes(format))
		return c.text("Invalid format", 400);

	// Хелпер: применяет resize / метаданные / формат
	const transform = async (file: File): Promise<{ buf: Buffer; name: string }> => {
		const inputBuffer = Buffer.from(await file.arrayBuffer());
		let image = sharp(inputBuffer, { failOnError: false });

		if (width || height) {
		image = image.resize({ width, height, fit: keepAspect ? "inside" : "fill" });
		}
		if (!stripMeta) image = image.withMetadata();

		switch (format) {
		case "png": image = image.png(); break;
		case "webp": image = image.webp({ quality: 90 }); break;
		default: image = image.jpeg({ quality: 90 });
		}

		const buf = await image.toBuffer();
		const base = file.name.replace(/\.[^/.]+$/, "");
		return { buf, name: `${base}.${format}` };
	};

	// ---------- Одиночный файл ----------
	const { buf, name } = await transform(files[0]);

	return new Response(new Uint8Array(buf), {
	headers: {
		"Content-Type": MIME[format],
		"Content-Length": String(buf.length),
		"Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
		"X-Converted-Filename": encodeURIComponent(name),
	},
	});

	// ---------- Несколько файлов → ZIP ----------
	const archive = archiver("zip", { zlib: { level: 1 } });
	const zipStream = new PassThrough();
	archive.pipe(zipStream);
	archive.on("error", (err) => zipStream.destroy(err as Error));

	for (const file of files) {
		const { buf, name } = await transform(file);
		archive.append(buf, { name });
	}
	archive.finalize();

	return new Response(Readable.toWeb(zipStream) as ReadableStream, {
		headers: {
		"Content-Type": "application/zip",
		"Content-Disposition": 'attachment; filename="images.zip"',
		},
	});
});

const port = Number(process.env.PORT) || 3001;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Backend listening on :${info.port}`);
});