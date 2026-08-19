import { describe, expect, it } from "vitest";
import { assertSafeUrl, UnsafeUrlError } from "@/lib/rss/ssrf";

describe("assertSafeUrl", () => {
  it("rejects non-http(s) protocols", async () => {
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects localhost", async () => {
    await expect(assertSafeUrl("http://localhost/feed.xml")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects literal loopback IP", async () => {
    await expect(assertSafeUrl("http://127.0.0.1/feed.xml")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects private 10.x IP", async () => {
    await expect(assertSafeUrl("http://10.0.0.5/feed.xml")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects cloud metadata endpoint 169.254.169.254", async () => {
    await expect(assertSafeUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects malformed URLs", async () => {
    await expect(assertSafeUrl("not a url")).rejects.toThrow(UnsafeUrlError);
  });

  it("allows a well-formed public https URL (literal IP, no DNS dependency)", async () => {
    const url = await assertSafeUrl("https://93.184.216.34/feed.xml");
    expect(url.hostname).toBe("93.184.216.34");
  });
});
