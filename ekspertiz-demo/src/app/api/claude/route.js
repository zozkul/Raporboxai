export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    console.log('Request model:', body.model)
    console.log('Messages count:', body.messages?.length)

    console.log("Request model:", model);
    console.log("Messages count:", messages?.length);
    console.log("Payload preview:", JSON.stringify(messages)?.slice(0,200));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    console.log('Anthropic status:', response.status)
    return Response.json(data, { status: response.status })
  } catch (error) {
    console.error('Route error:', error.message)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
