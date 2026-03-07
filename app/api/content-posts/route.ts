import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    let query = supabase
      .from("content_posts")
      .select("*, projects(id, name, color)")
      .order("scheduled_for", { ascending: true, nullsFirst: false });

    const platforms = searchParams.getAll("platform");
    if (platforms.length > 0) {
      query = query.in("platform", platforms);
    }

    const statuses = searchParams.getAll("status");
    if (statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const from = searchParams.get("from");
    if (from) {
      query = query.gte("scheduled_for", from);
    }

    const to = searchParams.get("to");
    if (to) {
      query = query.lte("scheduled_for", to);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("content_posts")
      .insert({
        id: crypto.randomUUID(),
        title: body.title ?? null,
        body: body.body ?? null,
        platform: body.platform ?? null,
        type: body.type ?? "post",
        status: body.status ?? "draft",
        scheduled_for: body.scheduled_for ?? null,
        project_id: body.project_id ?? null,
        media_urls: body.media_urls ?? null,
        metrics: body.metrics ?? {},
      })
      .select("*, projects(id, name, color)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from("content_posts")
      .update(updates)
      .eq("id", id)
      .select("*, projects(id, name, color)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("content_posts")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
