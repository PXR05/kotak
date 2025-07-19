export const prerender = true;

export async function GET({ url: { host } }) {
  const robotsTxt = `
User-agent: *
Allow: /
Crawl-delay: 1`;
  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
