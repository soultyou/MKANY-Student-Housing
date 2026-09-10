import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
// غير المسارات دي بناءً على مكان ملفاتك الفعلي
import { db } from '@/db'; 
import { users } from '@/db/schema'; 
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  // 1. هنجيب المفتاح السري من ملف البيئة
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // 2. هنجيب الـ Headers عشان نتأكد إن الطلب جاي من Clerk
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // لو مفيش Headers، هنرفض الطلب فوراً للحماية
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // 3. نقرأ البيانات اللي جاية من Clerk
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // 4. نتأكد من صحة البيانات باستخدام svix
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  const eventType = evt.type;

  // 5. لو الحدث هو إنشاء يوزر جديد (Sign Up)
  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    // هنسجل اليوزر في الداتا بيز بتاعتنا باستخدام Drizzle
    await db.insert(users).values({
      id: id, // بنستخدم نفس الـ ID كمعرف أساسي
      clerkUserId: id, // وبنحفظه برضه كـ Clerk ID للربط
      email: email_addresses[0].email_address,
      firstName: first_name || '',
      lastName: last_name || '',
      imageUrl: image_url || '',
    });
    
    console.log(`User ${id} was created successfully in database`);
  }

  // 6. لو الحدث هو تحديث بيانات اليوزر
  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    await db.update(users)
      .set({
        email: email_addresses[0].email_address,
        firstName: first_name || '',
        lastName: last_name || '',
        imageUrl: image_url || '',
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, id));
  }

  // 7. لو الحدث هو حذف اليوزر
  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    if (id) {
      await db.delete(users).where(eq(users.clerkUserId, id));
    }
  }

  return new Response('Webhook received', { status: 200 });
}
