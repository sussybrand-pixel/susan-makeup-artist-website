import { NextResponse, type NextRequest } from "next/server"
import { getContent, saveContent, defaultContent } from "@/lib/content"
import { rateLimit } from "@/lib/rateLimit"

const ALLOWED_SECTIONS = ["home", "about", "services", "packages", "portfolio", "contact", "settings"]

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store",
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() })
}

export async function GET(request: NextRequest, { params }: { params: { section: string } }) {
  const limited = rateLimit(request, { key: "content:get", max: 30, windowMs: 60_000 })
  if (limited.blocked && limited.response) return limited.response
  const section = params.section?.toLowerCase()
  if (!ALLOWED_SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Section not found" }, { status: 404, headers: corsHeaders() })
  }

  const data = await getContent(section)
  return NextResponse.json(data, { headers: corsHeaders() })
}

export async function PUT(request: NextRequest, { params }: { params: { section: string } }) {
  const limited = rateLimit(request, { key: "content:put", max: 10, windowMs: 60_000 })
  if (limited.blocked && limited.response) return limited.response
  const section = params.section?.toLowerCase()
  if (!ALLOWED_SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Section not found" }, { status: 404, headers: corsHeaders() })
  }

  const body = await request.json().catch(() => null)
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders() })
  }

  try {
    await saveContent(section, body)
    return NextResponse.json(body, { headers: corsHeaders() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save content" },
      { status: 500, headers: corsHeaders() },
    )
  }
}
