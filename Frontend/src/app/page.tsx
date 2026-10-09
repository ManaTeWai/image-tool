"use client";

import { Alert, Box, Button, Container, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import HeightIcon from "@mui/icons-material/Height";
import InputAdornment from "@mui/material/InputAdornment";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import { Dropzone } from "@/components";
import styles from "./page.module.css";

const presets = {
	original: {
		label: "Оригинал",
		description: "Не изменять размер",
		w: "",
		h: "",
		forceStrip: false,
		forceFormat: null,
		lockSize: false,
	},

	fullhd: {
		label: "Full HD",
		description: "1920 × 1080",
		w: "1920",
		h: "1080",
		forceStrip: false,
		forceFormat: null,
		lockSize: true,
	},

	"4k": {
		label: "4K",
		description: "3840 × 2160",
		w: "3840",
		h: "2160",
		forceStrip: false,
		forceFormat: null,
		lockSize: true,
	},

	tv: {
		label: "TV Safe",
		description: "1920 × 1080, JPEG",
		w: "1920",
		h: "1080",
		forceStrip: true,
		forceFormat: "jpeg",
		lockSize: true,
	},
};

type PresetKey = keyof typeof presets;

export default function Home() {
	const [files, setFiles] = useState<File[]>([]);

	const [width, setWidth] = useState("");
	const [height, setHeight] = useState("");

	const [format, setFormat] = useState("jpeg");
	const [stripMeta, setStripMeta] = useState(true);
	const [keepAspect, setKeepAspect] = useState(true);

	const [preset, setPreset] = useState<PresetKey>("original");

	const [dpi, setDpi] = useState("150");
	const [pages, setPages] = useState("");

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const emptySubscribe = () => () => {};

	const mounted = useSyncExternalStore(
		emptySubscribe,
		() => true,
		() => false,
	);

	const hasPdf = files.some((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

	const hasImages = files.some((file) => file.type.startsWith("image/") || !file.name.toLowerCase().endsWith(".pdf"));

	const previews = useMemo(
		() =>
			files.map((file) => ({
				file,
				url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
				isPdf: file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
			})),
		[files],
	);

	useEffect(() => {
		return () => {
			previews.forEach((preview) => {
				if (preview.url) {
					URL.revokeObjectURL(preview.url);
				}
			});
		};
	}, [previews]);

	function shortenName(name: string, head = 12, tail = 10) {
		if (name.length <= head + tail + 3) {
			return name;
		}

		return `${name.slice(0, head)}...${name.slice(-tail)}`;
	}

	function handleFiles(nextFiles: File[]) {
		setFiles(nextFiles);
		setError(null);
	}

	function clearFiles() {
		setFiles([]);
		setError(null);
	}

	function handlePresetChange(value: PresetKey) {
		const presetData = presets[value];

		setPreset(value);
		setWidth(presetData.w);
		setHeight(presetData.h);

		if (presetData.forceStrip) {
			setStripMeta(true);
		}

		if (presetData.forceFormat) {
			setFormat(presetData.forceFormat);
		}

		setKeepAspect(value !== "tv");
	}

	async function handleSubmit() {
		if (!files.length || loading) return;

		setLoading(true);
		setError(null);

		try {
			const form = new FormData();

			files.forEach((file) => {
				form.append("files", file);
			});

			form.append("width", width);
			form.append("height", height);
			form.append("format", format);
			form.append("stripMeta", String(stripMeta));
			form.append("keepAspect", keepAspect ? "1" : "0");
			form.append("dpi", dpi);
			form.append("pages", pages);

			const res = await fetch("/api/image/convert", {
				method: "POST",
				body: form,
			});

			if (!res.ok) {
				const text = await res.text().catch(() => "");

				throw new Error(text || `Ошибка обработки (${res.status})`);
			}

			const blob = await res.blob();

			let filename = "converted-images.zip";

			const contentType = res.headers.get("Content-Type") || "";

			if (!contentType.includes("application/zip")) {
				const fromHeader = res.headers.get("X-Converted-Filename");

				if (fromHeader) {
					filename = decodeURIComponent(fromHeader);
				}
			}

			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = filename;

			document.body.appendChild(a);
			a.click();
			a.remove();

			URL.revokeObjectURL(url);
		} catch (e) {
			console.error(e);

			setError(e instanceof Error ? e.message : "Неизвестная ошибка");
		} finally {
			setLoading(false);
		}
	}

	const outputLabel = format === "jpeg" ? "JPEG" : format.toUpperCase();

	const settingsTitle = hasPdf && !hasImages ? "2. Настройте PDF" : hasImages && !hasPdf ? "2. Настройте изображение" : "2. Настройте результат";

	return (
		<Container
			maxWidth="sm"
			sx={{
				mt: {
					xs: 3,
					sm: 6,
				},
				mb: 6,
			}}
		>
			<Paper
				elevation={2}
				sx={{
					p: {
						xs: 2,
						sm: 4,
					},
					borderRadius: 3,
				}}
			>
				{/* Header */}
				<Box sx={{ mb: 3 }}>
					<Typography variant="h5">Converter</Typography>

					<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
						Конвертация изображений и PDF в JPEG, PNG или WebP
					</Typography>
				</Box>

				{/* Step 1 */}
				<Box>
					<Typography variant="subtitle2" sx={{ mb: 1 }}>
						1. Выберите файлы
					</Typography>

					<Dropzone onFiles={handleFiles} />

					{files.length > 0 && (
						<Stack direction="row" sx={{ mt: 1.5, alignItems: "center", justifyContent: "space-between" }}>
							<Typography variant="body2" color="text.secondary">
								Выбрано файлов: <strong>{files.length}</strong>
							</Typography>

							<Button size="small" color="inherit" startIcon={<DeleteIcon />} onClick={clearFiles}>
								Очистить
							</Button>
						</Stack>
					)}
				</Box>

				{/* Preview */}
				{mounted && previews.length > 0 && (
					<Box
						className={styles.previews}
						sx={{
							mt: 2,
							display: "grid",
							gridTemplateColumns: "repeat(auto-fill, 100px)",
							gap: 2,
						}}
					>
						{previews.map(({ file, url, isPdf }) => (
							<Box
								key={`${file.name}-${file.size}-${file.lastModified}`}
								sx={{
									width: 100,
									minWidth: 0,
									textAlign: "center",
								}}
							>
								<Box
									sx={{
										width: 100,
										height: 100,
										overflow: "hidden",
										borderRadius: 1.5,
										border: "1px solid",
										borderColor: "divider",
										bgcolor: "action.hover",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									{isPdf ? (
										<Stack
											sx={{
												alignItems: "center",
											}}
											spacing={0.5}
										>
											<PictureAsPdfIcon
												sx={{
													fontSize: 42,
												}}
											/>

											<Typography variant="caption" color="text.secondary">
												PDF
											</Typography>
										</Stack>
									) : (
										<Image
											src={url!}
											alt={file.name}
											width={100}
											height={100}
											unoptimized
											style={{
												width: "100%",
												height: "100%",
												objectFit: "contain",
											}}
										/>
									)}
								</Box>

								<Typography
									variant="caption"
									title={file.name}
									sx={{
										display: "block",
										mt: 0.5,
										overflow: "hidden",
										whiteSpace: "nowrap",
										textOverflow: "ellipsis",
									}}
								>
									{shortenName(file.name)}
								</Typography>
							</Box>
						))}
					</Box>
				)}

				{/* Step 2 */}
				{files.length > 0 && (
					<Box sx={{ mt: 4 }}>
						<Typography variant="subtitle2" sx={{ mb: 1.5 }}>
							{settingsTitle}
						</Typography>

						{/* Format */}
						<TextField select fullWidth label="Формат" value={format} onChange={(e) => setFormat(e.target.value)} disabled={!!presets[preset].forceFormat} helperText={`Файлы будут сохранены в ${outputLabel}`}>
							<MenuItem value="jpeg">JPEG</MenuItem>

							<MenuItem value="png">PNG</MenuItem>

							<MenuItem value="webp">WebP</MenuItem>
						</TextField>

						{/* Image / common settings */}
						<Box sx={{ mt: 3 }}>
							<Typography variant="subtitle2" sx={{ mb: 1.5 }}>
								Размер изображения
							</Typography>

							<TextField select fullWidth label="Пресет" value={preset} onChange={(e) => handlePresetChange(e.target.value as PresetKey)}>
								{Object.entries(presets).map(([key, presetData]) => (
									<MenuItem key={key} value={key}>
										<Box>
											<Typography>{presetData.label}</Typography>

											<Typography variant="caption" color="text.secondary">
												{presetData.description}
											</Typography>
										</Box>
									</MenuItem>
								))}
							</TextField>

							<Box
								sx={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 2,
									mt: 2,
								}}
							>
								<TextField
									label="Ширина"
									type="number"
									value={width}
									onChange={(e) => setWidth(e.target.value)}
									disabled={presets[preset].lockSize}
									slotProps={{
										input: {
											startAdornment: (
												<InputAdornment position="start">
													<HeightIcon
														sx={{
															transform: "rotate(90deg)",
														}}
													/>
												</InputAdornment>
											),
										},
									}}
								/>

								<TextField
									label="Высота"
									type="number"
									value={height}
									onChange={(e) => setHeight(e.target.value)}
									disabled={presets[preset].lockSize}
									slotProps={{
										input: {
											startAdornment: (
												<InputAdornment position="start">
													<HeightIcon />
												</InputAdornment>
											),
										},
									}}
								/>
							</Box>

							<FormControlLabel
								sx={{
									mt: 1,
									ml: 0,
								}}
								control={<Switch checked={keepAspect} onChange={(e) => setKeepAspect(e.target.checked)} disabled={preset === "tv"} />}
								label={
									<Box>
										<Typography variant="body2">Сохранять пропорции</Typography>

										<Typography variant="caption" color="text.secondary">
											Изображение не будет растянуто
										</Typography>
									</Box>
								}
							/>
						</Box>

						{/* PDF settings */}
						{hasPdf && (
							<Paper
								variant="outlined"
								sx={{
									mt: 3,
									p: 2,
									borderRadius: 2,
								}}
							>
								<Stack direction="row" spacing={1} sx={{ mb: 2 }}>
									<PictureAsPdfIcon />

									<Box>
										<Typography variant="subtitle2">Настройки PDF</Typography>

										<Typography variant="caption" color="text.secondary">
											Параметры преобразования страниц PDF
										</Typography>
									</Box>
								</Stack>

								<Stack spacing={2}>
									<TextField select fullWidth label="Качество" value={dpi} onChange={(e) => setDpi(e.target.value)} helperText="DPI определяет детализацию страницы">
										<MenuItem value="72">72 DPI — быстро</MenuItem>

										<MenuItem value="150">150 DPI — оптимально</MenuItem>

										<MenuItem value="300">300 DPI — высокое качество</MenuItem>

										<MenuItem value="600">600 DPI — очень высокое качество</MenuItem>
									</TextField>

									<TextField fullWidth label="Страницы" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="Все страницы" helperText="Например: 1 или 2-5" />
								</Stack>
							</Paper>
						)}

						{/* Advanced */}
						<Box sx={{ mt: 3 }}>
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								Дополнительно
							</Typography>

							<FormControlLabel
								sx={{ ml: 0 }}
								control={<Switch checked={stripMeta} onChange={(e) => setStripMeta(e.target.checked)} disabled={presets[preset].forceStrip} />}
								label={
									<Box>
										<Typography variant="body2">Удалить метаданные</Typography>

										<Typography variant="caption" color="text.secondary">
											EXIF и другие данные из файла
										</Typography>
									</Box>
								}
							/>
						</Box>
					</Box>
				)}

				{/* Error */}
				{error && (
					<Alert severity="error" sx={{ mt: 3 }} onClose={() => setError(null)}>
						{error}
					</Alert>
				)}

				{/* Convert */}
				{files.length > 0 && (
					<Button
						sx={{
							mt: 4,
							py: 1.5,
							borderRadius: 2,
						}}
						variant="contained"
						fullWidth
						size="large"
						startIcon={loading ? undefined : <DownloadIcon />}
						disabled={loading}
						onClick={handleSubmit}
					>
						{loading ? "Обработка..." : `Конвертировать в ${outputLabel}`}
					</Button>
				)}
			</Paper>
		</Container>
	);
}
