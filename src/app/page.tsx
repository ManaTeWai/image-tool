"use client";

import { Box, Button, Container, Paper, TextField, Typography, MenuItem, Switch, FormControlLabel } from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import { Dropzone } from "@/components";
import Image from "next/image";

const presets = {
	original: { label: "Оригинал", w: "", h: "", forceStrip: false },
	fullhd: { label: "Full HD (1920×1080)", w: "1920", h: "1080", forceStrip: false },
	"4k": { label: "4K (3840×2160)", w: "3840", h: "2160", forceStrip: false },
	tv: { label: "TV Safe (1920×1080)", w: "1920", h: "1080", forceStrip: true },
};

export default function Home() {
	const [files, setFiles] = useState<File[]>([]);
	const [width, setWidth] = useState("");
	const [height, setHeight] = useState("");
	const [format, setFormat] = useState("jpeg");
	const [stripMeta, setStripMeta] = useState(true);
	const [loading, setLoading] = useState(false);
	const [preset, setPreset] = useState("original");

	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const previews = useMemo(
		() =>
			files.map((file) => ({
				file,
				url: URL.createObjectURL(file),
			})),
		[files]
	);

	async function handleSubmit() {
		if (!files.length) return;

		setLoading(true);

		try {
			const form = new FormData();
			files.forEach((f) => form.append("files", f));
			form.append("width", width);
			form.append("height", height);
			form.append("format", format);
			form.append("stripMeta", String(stripMeta));

			const res = await fetch("/api/image/convert", {
				method: "POST",
				body: form,
			});

			if (!res.ok) throw new Error("Ошибка обработки");

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = "images.zip";
			a.click();
		} catch (e) {
			console.error(e);
		} finally {
			setLoading(false);
		}
	}

	return (
		<Container maxWidth="sm" sx={{ mt: 8 }}>
			<Paper sx={{ p: 4 }}>
				<Typography variant="h5" gutterBottom>
					Image Converter
				</Typography>

				<Box sx={{ mt: 2 }}>
					<Dropzone onFiles={setFiles} />

					{files.length > 0 && (
						<Typography sx={{ mt: 1 }} variant="body2">
							Выбрано файлов: {files.length}
						</Typography>
					)}
				</Box>

				{/* Превью файлов */}
				{mounted && previews.length > 0 && (
					<Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "repeat(auto-fill, 100px)", gap: 2 }}>
						{previews.map(({ file, url }) => (
							<Box key={file.name} sx={{ textAlign: "center" }}>
								<Image src={url} alt={file.name} width="100" height="100" objectFit="cover" />
								<Typography variant="caption">
									{file.name}
								</Typography>
							</Box>
						))}
					</Box>
				)}

				{/* Presets */}
				<TextField
					select
					fullWidth
					sx={{ mt: 3 }}
					label="Пресет"
					value={preset}
					onChange={(e) => {
						const p = e.target.value;
						setPreset(p);
						setWidth(presets[p].w);
						setHeight(presets[p].h);

						if (presets[p].forceStrip) {
							setStripMeta(true);
						}
					}}
				>
					{Object.entries(presets).map(([key, p]) => (
						<MenuItem key={key} value={key}>
							{p.label}
						</MenuItem>
					))}
				</TextField>

				<Box sx={{ display: "flex", gap: 2, mt: 3 }}>
					<TextField label="Ширина" fullWidth value={width} onChange={(e) => setWidth(e.target.value)} />
					<TextField label="Высота" fullWidth value={height} onChange={(e) => setHeight(e.target.value)} />
				</Box>

				<TextField select fullWidth sx={{ mt: 3 }} label="Формат" value={format} onChange={(e) => setFormat(e.target.value)}>
					<MenuItem value="jpeg">JPEG</MenuItem>
					<MenuItem value="png">PNG</MenuItem>
					<MenuItem value="webp">WEBP</MenuItem>
				</TextField>

				<FormControlLabel sx={{ mt: 2 }} control={<Switch checked={stripMeta} onChange={(e) => setStripMeta(e.target.checked)} disabled={presets[preset].forceStrip} />} label="Удалить метаданные" />

				<Button sx={{ mt: 3 }} variant="contained" fullWidth disabled={!files.length || loading} onClick={handleSubmit}>
					{loading ? "Обработка..." : "Конвертировать"}
				</Button>
			</Paper>
		</Container>
	);
}
