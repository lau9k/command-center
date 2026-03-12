import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { encrypt } from "@/lib/gmail-crypto";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // user_id for CSRF verification
  const error = url.searchParams.get("error");

  const redirectBase = `${url.origin}/settings/data-sources`;

  if (error) {
    return NextResponse.redirect(
      `${redirectBase}?gmail=error&message=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${redirectBase}?gmail=error&message=missing_params`
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${redirectBase}?gmail=error&message=not_configured`
    );
  }

  const redirectUri = `${url.origin}/api/gmail/callback`;
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${redirectBase}?gmail=error&message=no_refresh_token`
      );
    }

    // Get the user's email address from Gmail API
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const emailAddress = profile.data.emailAddress;

    if (!emailAddress) {
      return NextResponse.redirect(
        `${redirectBase}?gmail=error&message=no_email`
      );
    }

    // Store the account with encrypted refresh token
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from("gmail_accounts")
      .select("id, status")
      .eq("email_address", emailAddress)
      .single();

    if (existing) {
      await supabase
        .from("gmail_accounts")
        .update({
          refresh_token_encrypted: encrypt(tokens.refresh_token),
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("gmail_accounts").insert({
        email_address: emailAddress,
        refresh_token_encrypted: encrypt(tokens.refresh_token),
        status: "active",
      });
    }

    return NextResponse.redirect(`${redirectBase}?gmail=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      `${redirectBase}?gmail=error&message=${encodeURIComponent(message)}`
    );
  }
}
