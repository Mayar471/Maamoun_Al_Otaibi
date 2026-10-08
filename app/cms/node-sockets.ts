import { connect as tlsConnect } from "node:tls";
import { Readable, Writable } from "node:stream";
// Node equivalent of the Cloudflare TLS socket, selected only by the Node build.
export function connect(address: { hostname: string; port: number }, options: { secureTransport: string }) {
  if (options.secureTransport !== "on" || address.hostname !== "smtp.gmail.com" || address.port !== 465) throw new Error("Only Gmail TLS is supported");
  const socket = tlsConnect({ host: address.hostname, port: address.port, servername: address.hostname });
  const opened = new Promise<{ remoteAddress: string | null; localAddress: string | null }>((resolve, reject) => {
    socket.once("secureConnect", () => resolve({ remoteAddress: socket.remoteAddress ?? null, localAddress: socket.localAddress ?? null }));
    socket.once("error", reject);
  });
  const closed = new Promise<void>((resolve, reject) => { socket.once("close", () => resolve()); socket.once("error", reject); });
  return { readable: Readable.toWeb(socket) as ReadableStream<Uint8Array>, writable: Writable.toWeb(socket) as WritableStream<Uint8Array>, opened, closed, async close() { socket.destroy(); await closed; } };
}
