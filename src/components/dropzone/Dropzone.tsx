"use client";

import { useDropzone } from "react-dropzone";
import { Box, Typography } from "@mui/material";

export const Dropzone = ({ onFiles }: { onFiles: (files: File[]) => void }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    multiple: true,
    onDrop: (acceptedFiles) => onFiles(acceptedFiles),
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: "2px dashed #555",
        borderRadius: 2,
        p: 4,
        textAlign: "center",
        cursor: "pointer",
        bgcolor: isDragActive ? "rgba(255,255,255,0.05)" : "transparent",
      }}
    >
      <input {...getInputProps()} />
      <Typography>
        Перетащи изображения сюда или кликни
      </Typography>
    </Box>
  );
}