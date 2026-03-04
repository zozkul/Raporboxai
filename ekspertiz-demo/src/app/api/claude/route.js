export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()

    const model = "claude-sonnet-4-20250514"

    const messages =
      Array.isArray(body?.messages) && body.messages.length
        ? body.messages
        : [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: String(body?.prompt ?? "")
                }
              ]
            }
          ]

    console.log("Request model:", model)
    console.log("Messages count:", messages.length)

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        messages
      })
    })

    const data = await response.json()

    console.log("Anthropic status:", response.status)

    return Response.json(data, { status: response.status })

  } catch (error) {
    console.error("Route error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
