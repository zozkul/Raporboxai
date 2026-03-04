export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();

    // 1) İstemciden geleni normalize et
    const model = body?.model ?? "claude-sonnet-4-20250514";

    // Eğer body.messages gelmediyse, body.prompt'tan üret
    const messages =
      Array.isArray(body?.messages) && body.messages.length
        ? body.messages
        : [
            {
              role: "user",
              content: [{ type: "text", text: String(body?.prompt ?? "") }],
            },
          ];

    const max_tokens = Number(body?.max_tokens ?? 600);

    // 2) Basit doğrulama (prompt'u loglama)
    if (!messages?.length) {
      return Response.json({ error: "messages is required" }, { status: 400 });
    }
    if (!max_tokens || Number.isNaN(max_tokens)) {
      return Response.json({ error: "max_tokens is required" }, { status: 400 });
    }
    // content string ise array'e çevir (Anthropic formatı)
    for (const m of messages) {
      if (typeof m?.content === "string") {
        m.content = [{ type: "text", text: m.content }];
      }
    }

    // 3) Debug log (güvenli)
    console.log("Request model:", model);
    console.log("Messages count:", messages.length);

    // 4) Anthropic'e doğru payload
    const payload = {
      model,
      max_tokens,
      messages,
      // system: body?.system, // istersen açarsın
      // temperature: body?.temperature,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text(); // önce text al
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log("Anthropic status:", response.status);
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Route error:", error?.message);
    return Response.json({ error: error?.message }, { status: 500 });
  }
}
