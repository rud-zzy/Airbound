
export async function onRequest(context) {
  try {
    const result = await context.env.DB.prepare(
      "SELECT 1 AS database_connected"
    ).first();

    return Response.json({
      status: "ok",
      database: result?.database_connected === 1
        ? "connected"
        : "error"
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        message: "Database connection failed"
      },
      { status: 500 }
    );
  }
}

