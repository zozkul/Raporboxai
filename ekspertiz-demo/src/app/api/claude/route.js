export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()

    // Web search tool'u ekle (sadece QA ve araştırma çağrıları için)
    const useSearch = body.use_search === true

    const requestBody = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: body.system,
      messages: body.messages,
    }

    if (useSearch) {
      requestBody.tools = [{ type: "web_search_20250305", name: "web_search" }]
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()
    console.log("Anthropic status:", response.status, "stop_reason:", data.stop_reason)

    // Tool use döngüsü — web_search yanıtlarını işle
    if (data.stop_reason === "tool_use" && useSearch) {
      const toolUseBlocks = data.content.filter(b => b.type === "tool_use")
      const toolResults = []

      for (const toolBlock of toolUseBlocks) {
        // Anthropic web_search tool kendi aramasını yapıyor,
        // sonuç zaten content içinde tool_result olarak geliyor.
        // Biz sadece mevcut mesajlara ekleyip devam ediyoruz.
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: "Arama tamamlandı."
        })
      }

      // Devam isteği gönder
      const continueMessages = [
        ...body.messages,
        { role: "assistant", content: data.content },
        { role: "user", content: toolResults }
      ]

      const continueResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: body.system,
          messages: continueMessages,
          tools: [{ type: "web_search_20250305", name: "web_search" }]
        })
      })

      const continueData = await continueResponse.json()
      return Response.json(continueData, { status: continueResponse.status })
    }

    return Response.json(data, { status: response.status })
  } catch (error) {
    console.error("Route error:", error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
