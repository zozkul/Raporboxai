export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: body.system,
        messages: body.messages
      })
    })

    const text = await response.text()
    console.log("Anthropic status:", response.status)
    console.log("Anthropic body:", text.substring(0, 300))
    
    let data
    try { data = JSON.parse(text) } catch { data = { raw: text } }
    
    return Response.json(data, { status: response.status })
  } catch (error) {
    console.error("Route error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
