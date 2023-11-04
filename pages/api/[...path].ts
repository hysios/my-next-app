// import httpProxy from 'http-proxy'
import type { NextApiRequest, NextApiResponse } from 'next'

const API_URL = process.env.API_URL // The actual URL of your API

export const config = {
	api: {
		bodyParser: false,
	},
	runtime: 'edge',
}

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>
) {
	return streamProxy(req, res)
}

function proxy(req: NextApiRequest, res: NextApiResponse) {
	let u = new URL(req.url!);
	let headers = new Headers();

	for (let [k, v] of Object.entries(req.headers)) {
		headers.set(k, v as string);
	}
	return fetch(API_URL + u.pathname, {
		method: req.method,
		headers: headers,
		body: req.body,
	}).then((response) => {
		return new Response(response.body, { headers: { "Content-Type": "application/json" } })
	})
}

function streamProxy(req: NextApiRequest, res: NextApiResponse) {
	let u = new URL(req.url!);
	let headers = new Headers();

	return fetch(API_URL + u.pathname, {
		method: req.method,
		headers: headers,
		body: req.body,
	})
		.then((response) => ({
			body: response.body,
			headers: response.headers
		}))
		.then((rb) => {
			const reader = rb.body!.getReader();
			return {
				stream: new ReadableStream({
					async pull(controller) {
						const { value, done } = await reader.read()
						if (done) {
							controller.close()
						} else {
							controller.enqueue(value)
						}
					},
				}),
				headers: rb.headers
			}
		})
		.then((stream) =>
			// Respond with our stream
			new Response(stream.stream, { headers: stream.headers })
		)
}