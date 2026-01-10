"use client";

import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [format, setFormat] = useState("jpeg");
  const [stripMeta, setStripMeta] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!file) return;

    const form = new FormData();
    form.append("file", file);
    form.append("width", width);
    form.append("height", height);
    form.append("format", format);
    form.append("stripMeta", String(stripMeta));

    setLoading(true);

    const res = await fetch("/api/image/convert", {
      method: "POST",
      body: form,
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `image.${format}`;
    a.click();

    setLoading(false);
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Image Converter
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" component="label" fullWidth>
            Выбрать файл
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Button>

          {file && (
            <Typography sx={{ mt: 1 }} variant="body2">
              {file.name}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
          <TextField
            label="Ширина"
            fullWidth
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
          <TextField
            label="Высота"
            fullWidth
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </Box>

        <TextField
          select
          fullWidth
          sx={{ mt: 3 }}
          label="Формат"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <MenuItem value="jpeg">JPEG</MenuItem>
          <MenuItem value="png">PNG</MenuItem>
          <MenuItem value="webp">WEBP</MenuItem>
        </TextField>

        <FormControlLabel
          sx={{ mt: 2 }}
          control={
            <Switch
              checked={stripMeta}
              onChange={(e) => setStripMeta(e.target.checked)}
            />
          }
          label="Удалить метаданные"
        />

        <Button
          sx={{ mt: 3 }}
          variant="contained"
          fullWidth
          disabled={!file || loading}
          onClick={handleSubmit}
        >
          {loading ? "Обработка..." : "Конвертировать"}
        </Button>
      </Paper>
    </Container>
  );
}