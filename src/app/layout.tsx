import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

export const metadata = {
  title: "Image Tool",
};

const theme = createTheme({
  palette: {
    mode: "dark",
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}