
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.pathname === "/auth/discord") {
    const params = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      redirect_uri: `${url.origin}/auth/discord/callback`,
      response_type: "code",
      scope: "identify"
    });

    return Response.redirect(
      `https://discord.com/oauth2/authorize?${params}`,
      302
    );
  }

  if (url.pathname === "/auth/discord/callback") {
    const code = url.searchParams.get("code");

    if (!code || url.searchParams.has("error")) {
      return new Response("Discord login was cancelled or failed.", {
        status: 400
      });
    }

    const redirectUri = `${url.origin}/auth/discord/callback`;

    const tokenResponse = await fetch(
      "https://discord.com/api/v10/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri
        })
      }
    );

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.access_token) {
      return new Response("Discord token exchange failed.", {
        status: 400
      });
    }

    const userResponse = await fetch(
      "https://discord.com/api/v10/users/@me",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      }
    );

    if (!userResponse.ok) {
      return new Response("Could not retrieve Discord profile.", {
        status: 400
      });
    }

    const user = await userResponse.json();

    await env.DB.prepare(`
      INSERT INTO users (discord_id, discord_username)
      VALUES (?, ?)
      ON CONFLICT(discord_id)
      DO UPDATE SET discord_username = excluded.discord_username
    `).bind(user.id, user.username).run();

    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const sessionToken = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(sessionToken)
    );

    const tokenHash = Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

    await env.DB.prepare(`
      INSERT INTO sessions (session_token_hash, discord_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(tokenHash, user.id, expiresAt).run();

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}/?login=success`,
        "Set-Cookie": `__Host-airbound_session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
      }
    });
  }

  return new Response("Not found.", { status: 404 });
}

