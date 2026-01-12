import { NextRequest } from "next/server";
import sharp from "sharp";
import archiver from "archiver";
import { PassThrough } from "stream";
import { Readable } from "stream";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	try {
		const formData = await req.formData();

		/* ================================
		   Files
		================================ */
		const rawFiles = formData.getAll("files");
		const files = rawFiles.filter(
			
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(f): f is File => typeof (f as any)?.arrayBuffer === "function"
		);

		if (!files.length) {
			return new Response("No files uploaded", { status: 400 });
		}

		/* ================================
		   Params
		================================ */
		const width = Number(formData.get("width")) || undefined;
		const height = Number(formData.get("height")) || undefined;

		const keepAspect = formData.get("keepAspect") !== "0";
		const stripMeta = formData.get("stripMeta") === "true";

		let format = String(formData.get("format") || "jpeg").toLowerCase();
		if (format === "jpg") format = "jpeg";

		if (!["jpeg", "png", "webp"].includes(format)) {
			return new Response("Invalid format", { status: 400 });
		}

		/* ================================
		   ZIP stream
		================================ */
		const archive = archiver("zip", { zlib: { level: 9 } });
		const zipStream = new PassThrough();

		archive.pipe(zipStream);

		archive.on("error", (err: unknown) => {
			console.error("ZIP error:", err);
			zipStream.destroy(err as Error);
		});

		/* ================================
		   Process files
		================================ */
		for (const file of files) {
			const inputBuffer = Buffer.from(await file.arrayBuffer());

			let image = sharp(inputBuffer, { failOnError: false });

			if (width || height) {
				image = image.resize({
					width,
					height,
					fit: keepAspect ? "inside" : "fill",
				});
			}

			if (!stripMeta) {
				image = image.withMetadata();
			}

			switch (format) {
				case "png":
					image = image.png();
					break;
				case "webp":
					image = image.webp({ quality: 90 });
					break;
				default:
					image = image.jpeg({ quality: 90 });
			}

			const output = await image.toBuffer();

			const base = file.name.replace(/\.[^/.]+$/, "");
			archive.append(output, { name: `${base}.${format}` });
		}

		archive.finalize();

		/* ================================
		   Return stream
		================================ */
		const webStream = Readable.toWeb(zipStream) as ReadableStream;

		return new Response(webStream, {
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": 'attachment; filename="images.zip"',
			},
		});
	} catch (err) {
		console.error("Convert error:", err);
		return new Response("Image processing failed", { status: 500 });
	}
}