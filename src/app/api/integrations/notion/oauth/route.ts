import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (code) {
    // Mock OAuth callback - in production, exchange code for access token
    const redirectUrl = new URL("/integrations/notion", request.url);
    redirectUrl.searchParams.set("connected", "true");
    redirectUrl.searchParams.set("workspace", "Northwind Demo Workspace");
    return NextResponse.redirect(redirectUrl);
  }

  // Initiate OAuth flow (mock)
  const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NOTION_CLIENT_ID || "demo_client_id"}&redirect_uri=${process.env.NOTION_REDIRECT_URI || "http://localhost:3000/api/integrations/notion/oauth"}&response_type=code&owner=user&state=${state || "inkloom-demo"}`;

  return NextResponse.redirect(authUrl);
}