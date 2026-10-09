import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	const backendUrl = process.env.BACKEND_URL;

	if (!backendUrl) {
		return new Response("BACKEND_URL не настроен", { status: 500 });
	}

	try {
		const formData = await request.formData();

		const response = await fetch(`${backendUrl}/convert`, {
			method: "POST",
			body: formData,
		});

		const body = await response.arrayBuffer();

		const headers = new Headers();

		for (const name of ["Content-Type", "Content-Disposition", "Content-Length", "X-Converted-Filename"]) {
			const value = response.headers.get(name);
			if (value) {
				headers.set(name, value);
			}
		}

		return new Response(body, {
			status: response.status,
			headers,
		});
	} catch (error) {
		console.error("Backend proxy error:", error);

		return new Response("Ошибка связи с backend", {
			status: 502,
		});
	}
}
