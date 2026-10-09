import Providers from "./providers";

// export const instant = false;

export const metadata = {
	title: "Image Tool",
	description: "Конвертация изображений и PDF в JPEG, PNG или WebP",
	openGraph: {
		title: "Image Tool",
		description: "Конвертация изображений и PDF в JPEG, PNG или WebP",
		url: "https://image.stavik.ru",
		siteName: "Обработчик изображений",
		images: [
			{
				url: "https://image.stavik.ru/preview.png",
				width: 3360,
				height: 1936,
				alt: "Конвертация изображений и PDF в JPEG, PNG или WebP",
			},
		],
		locale: "ru_RU",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Image Tool",
		description: "Конвертация изображений и PDF в JPEG, PNG или WebP",
		images: ["https://image.stavik.ru/preview.png"],
		creator: "@manatewai",
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru">
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
