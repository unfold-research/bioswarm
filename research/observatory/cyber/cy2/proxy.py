"""Egress proxy for paid cyber runs: an HTTP CONNECT proxy that opens a tunnel to api.anthropic.com:443 and to nothing
else. The runner container sits on an internal Docker network (no route out) with this proxy as its only exit; the proxy
also sits on the default bridge. TLS stays end to end: the proxy never sees the key or the traffic.

  python proxy.py [port]       (default 3128)
"""
import asyncio, sys, time

ALLOW = {("api.anthropic.com", 443)}


def log(*a):
    print(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), *a, flush=True)


async def pipe(r, w):
    try:
        while data := await r.read(65536):
            w.write(data)
            await w.drain()
    except Exception:
        pass
    finally:
        try:
            w.close()
        except Exception:
            pass


async def handle(r, w):
    try:
        head = await asyncio.wait_for(r.readuntil(b"\r\n\r\n"), 15)
        method, target, _ = head.split(b"\r\n", 1)[0].decode("latin-1").split(" ", 2)
        host, _, port = target.rpartition(":")
        if method != "CONNECT" or (host.lower(), int(port or 0)) not in ALLOW:
            log("deny", method, target)
            w.write(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n")
            await w.drain()
            w.close()
            return
        ur, uw = await asyncio.wait_for(asyncio.open_connection(host, int(port)), 15)
        w.write(b"HTTP/1.1 200 Connection established\r\n\r\n")
        await w.drain()
        await asyncio.gather(pipe(r, uw), pipe(ur, w))
    except Exception as e:
        log("error", type(e).__name__)
        try:
            w.close()
        except Exception:
            pass


async def main(port):
    srv = await asyncio.start_server(handle, "0.0.0.0", port)
    log("egress proxy on", port, "allow", sorted(ALLOW))
    async with srv:
        await srv.serve_forever()


if __name__ == "__main__":
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 3128))
