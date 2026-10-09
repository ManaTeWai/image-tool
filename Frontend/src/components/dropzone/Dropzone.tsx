"use client";

import { useDropzone } from "react-dropzone";
import { Box, Stack, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";

export const Dropzone = ({ onFiles }: { onFiles: (files: File[]) => void }) => {
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		accept: {
			"image/jpeg": [".jpg", ".jpeg"],
			"image/png": [".png"],
			"image/webp": [".webp"],
			"application/pdf": [".pdf"],
		},
		multiple: true,
		onDrop: (acceptedFiles) => onFiles(acceptedFiles),
	});

	return (
		<Box
			{...getRootProps()}
			sx={{
				border: "2px dashed",
				borderColor: isDragActive ? "primary.main" : "divider",
				borderRadius: 2,
				px: 2,
				py: 4,
				textAlign: "center",
				cursor: "pointer",
				transition: "border-color 0.2s, background-color 0.2s",
				bgcolor: isDragActive ? "action.hover" : "transparent",
				"&:hover": {
					borderColor: "primary.main",
					bgcolor: "action.hover",
				},
			}}
		>
			<input {...getInputProps()} />

			<Stack spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
				<UploadFileIcon
					sx={{
						fontSize: 42,
						color: "text.secondary",
					}}
				/>

				<Typography>{isDragActive ? "Отпустите файлы здесь" : "Перетащите файлы сюда"}</Typography>

				<Typography variant="body2" color="text.secondary">
					или нажмите, чтобы выбрать
				</Typography>

				<Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }}>
					<Stack direction="row" spacing={0.5}>
						<ImageIcon
							sx={{
								fontSize: 15,
							}}
						/>

						<Typography variant="caption" color="text.secondary">
							JPEG · PNG · WebP
						</Typography>

						<Typography variant="caption" color="text.disabled">
							•
						</Typography>
					</Stack>

					<Stack direction="row" spacing={0.5}>
						<PictureAsPdfIcon
							sx={{
								fontSize: 15,
							}}
						/>

						<Typography variant="caption" color="text.secondary">
							PDF
						</Typography>
					</Stack>
				</Stack>
			</Stack>
		</Box>
	);
};
