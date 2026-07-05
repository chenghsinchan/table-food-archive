import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:notifications@table.app";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

type SubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function POST(request: Request) {
  if (!configureWebPush()) {
    return NextResponse.json({ error: "Push notifications are not configured." }, { status: 501 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not connected." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let payloadBody: { entryId?: string };
  try {
    payloadBody = (await request.json()) as { entryId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const entryId = payloadBody?.entryId;
  if (!entryId) {
    return NextResponse.json({ error: "Missing entryId." }, { status: 400 });
  }

  // The new card. RLS guarantees the caller can only see entries in their groups.
  const { data: entry } = await supabase
    .from("food_entries")
    .select("id, title, group_id, created_by")
    .eq("id", entryId)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  const creatorId = (entry.created_by as string | null) ?? user.id;

  // Creator's display name for the notification title.
  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", creatorId)
    .maybeSingle();

  const creatorName =
    creatorProfile?.display_name || creatorProfile?.email?.split("@")[0] || "Someone";

  // Everyone in the card's group except the creator.
  let recipientIds: string[] = [];
  if (entry.group_id) {
    const { data: memberRows } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", entry.group_id);

    recipientIds = ((memberRows ?? []) as Array<{ user_id: string }>)
      .map((row) => row.user_id)
      .filter((id) => id !== creatorId);
  }

  if (!recipientIds.length) {
    return NextResponse.json({ sent: 0, note: "No other members to notify." });
  }

  const { data: subscriptionRows } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", recipientIds);

  const subscriptions = (subscriptionRows ?? []) as SubscriptionRow[];
  if (!subscriptions.length) {
    return NextResponse.json({ sent: 0, note: "No subscribed devices." });
  }

  const notification = JSON.stringify({
    title: `${creatorName} added a food card`,
    body: entry.title,
    url: `/entry/${entry.id}`
  });

  const staleIds: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          notification
        );
        sent += 1;
      } catch (caught) {
        const statusCode = (caught as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(subscription.id);
        }
      }
    })
  );

  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({ sent, removed: staleIds.length });
}
