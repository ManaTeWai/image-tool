import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import sharp from "sharp";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";
import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);

const app = new Hono();
app.use("*", cors());

const MIME: Record<string, string> = {
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
};

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

app.get("/healthz", (c) => c.text("ok"));

/**
 * Рендерит PDF в массив PNG-буферов.
 */
async function renderPdf(file: File, dpi: number, pages?: string): Promise<{ buffers: Buffer[]; baseName: string }> {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "image-tool-"));

	try {
		const pdfPath = path.join(tempDir, "input.pdf");
		const outputPrefix = path.join(tempDir, "page");

		await fs.writeFile(pdfPath, Buffer.from(await file.arrayBuffer()));

		const args = ["-png", "-r", String(dpi)];

		// Конкретные страницы, если указаны.
		//
		// Пример:
		// pages=1
		// pages=1-3
		// pages=2-5
		if (pages) {
			const match = pages.match(/^(\d+)(?:-(\d+))?$/);

			if (!match) {
				throw new Error("Некорректный диапазон страниц");
			}

			const firstPage = Number(match[1]);
			const lastPage = Number(match[2] || match[1]);

			if (firstPage < 1 || lastPage < firstPage || lastPage - firstPage > 100) {
				throw new Error("Некорректный диапазон страниц");
			}

			args.push("-f", String(firstPage), "-l", String(lastPage));
		}

		args.push(pdfPath, outputPrefix);

		await execFileAsync("pdftoppm", args);

		const files = await fs.readdir(tempDir);

		const pageFiles = files
			.filter((name) => /^page-\d+\.png$/i.test(name))
			.sort((a, b) => {
				const na = Number(a.match(/\d+/)?.[0] || 0);
				const nb = Number(b.match(/\d+/)?.[0] || 0);
				return na - nb;
			});

		if (!pageFiles.length) {
			throw new Error("PDF не содержит страниц");
		}

		const buffers = await Promise.all(pageFiles.map((name) => fs.readFile(path.join(tempDir, name))));

		const baseName = file.name.replace(/\.pdf$/i, "");

		return {
			buffers,
			baseName,
		};
	} finally {
		await fs.rm(tempDir, {
			recursive: true,
			force: true,
		});
	}
}

/**
 * Обрабатывает изображение через sharp.
 */
async function transformImage(inputBuffer: Buffer, format: string, width?: number, height?: number, keepAspect = true, stripMeta = false): Promise<Buffer> {
	let image = sharp(inputBuffer, {
		failOnError: false,
	});

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
			image = image.webp({
				quality: 90,
			});
			break;

		default:
			image = image.jpeg({
				quality: 90,
			});
	}

	return image.toBuffer();
}

app.post("/convert", async (c) => {
	const formData = await c.req.formData();

	const rawFiles = formData.getAll("files");

	const files = rawFiles.filter((f): f is File => typeof (f as any)?.arrayBuffer === "function");

	if (!files.length) {
		return c.text("No files uploaded", 400);
	}

	const width = Number(formData.get("width")) || undefined;
	const height = Number(formData.get("height")) || undefined;

	const keepAspect = formData.get("keepAspect") !== "0";

	const stripMeta = formData.get("stripMeta") === "true";

	let format = String(formData.get("format") || "jpeg").toLowerCase();

	if (format === "jpg") {
		format = "jpeg";
	}

	if (!["jpeg", "png", "webp"].includes(format)) {
		return c.text("Invalid format", 400);
	}

	/**
	 * DPI используется только для PDF.
	 */
	const dpiRaw = Number(formData.get("dpi"));
	const dpi = Math.min(Math.max(dpiRaw || 150, 72), 600);

	/**
	 * Например:
	 * 1
	 * 1-3
	 * 5-10
	 */
	const pagesRaw = String(formData.get("pages") || "").trim();

	const pages = pagesRaw || undefined;

	type OutputFile = {
		buf: Buffer;
		name: string;
	};

	const outputs: OutputFile[] = [];

	for (const file of files) {
		const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

		if (isPdf) {
			const rendered = await renderPdf(file, dpi, pages);

			for (let i = 0; i < rendered.buffers.length; i++) {
				const buf = await transformImage(rendered.buffers[i], format, width, height, keepAspect, stripMeta);

				outputs.push({
					buf,
					name: `${rendered.baseName}-${String(i + 1).padStart(3, "0")}.${format}`,
				});
			}

			continue;
		}

		/**
		 * Обычное изображение.
		 */
		const inputBuffer = Buffer.from(await file.arrayBuffer());

		const buf = await transformImage(inputBuffer, format, width, height, keepAspect, stripMeta);

		const base = file.name.replace(/\.[^/.]+$/, "");

		outputs.push({
			buf,
			name: `${base}.${format}`,
		});
	}

	if (!outputs.length) {
		return c.text("No files processed", 400);
	}

	/**
	 * Один результат → отдаём непосредственно файл.
	 */
	if (outputs.length === 1) {
		const output = outputs[0];

		return new Response(new Uint8Array(output.buf), {
			headers: {
				"Content-Type": MIME[format],
				"Content-Length": String(output.buf.length),
				"Content-Disposition": `attachment; filename="${encodeURIComponent(output.name)}"`,
				"X-Converted-Filename": encodeURIComponent(output.name),
			},
		});
	}

	/**
	 * Несколько результатов → ZIP.
	 */
	const archive = archiver("zip", {
		zlib: {
			level: 1,
		},
	});

	const zipStream = new PassThrough();

	archive.pipe(zipStream);

	archive.on("error", (err) => {
		zipStream.destroy(err as Error);
	});

	for (const output of outputs) {
		archive.append(output.buf, {
			name: output.name,
		});
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

serve(
	{
		fetch: app.fetch,
		port,
	},
	(info) => {
		console.log(`Backend listening on :${info.port}`);
	},
);
