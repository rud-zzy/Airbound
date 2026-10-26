
async function hashToken(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function onRequest({ request, env }) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(
    /(?:^|;\s*)__Host-airbound_session=([a-f0-9]{64})(?:;|$)/
  );

  if (!match) {
    return Response.json({ loggedIn: false }, { status: 401 });
  }

  try {
    const tokenHash = await hashToken(match[1]);

    const session = await env.DB.prepare(`
      SELECT users.discord_id, users.discord_username
      FROM sessions
      JOIN users ON users.discord_id = sessions.discord_id
      WHERE sessions.session_token_hash = ?
        AND sessions.expires_at > ?
    `)
      .bind(tokenHash, Math.floor(Date.now() / 1000))
      .first();

    if (!session) {
      return Response.json({ loggedIn: false }, { status: 401 });
    }

    return Response.json({
      loggedIn: true,
      discord: {
        id: session.discord_id,
        username: session.discord_username
      }
    });
  } catch {
    return Response.json(
      { error: "Could not check login session." },
      { status: 500 }
    );
  }
}

