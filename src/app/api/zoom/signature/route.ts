import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function generateSignature(sdkKey: string, sdkSecret: string, meetingNumber: string, role: number): string {
  const iat = Math.round(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sdkKey, mn: meetingNumber, role, iat, exp, tokenExp: exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', sdkSecret).update(`${header}.${payload}`).digest('base64url');

  return `${header}.${payload}.${sig}`;
}

export async function POST(req: NextRequest) {
  const { meetingNumber, role } = await req.json();

  const sdkKey = process.env.ZOOM_SDK_KEY ?? '';
  const sdkSecret = process.env.ZOOM_SDK_SECRET ?? '';

  if (!sdkKey || !sdkSecret) {
    return NextResponse.json({ signature: '', sdkKey: '', demoMode: true });
  }

  const cleanNumber = String(meetingNumber).replace(/\D/g, '');
  const signature = generateSignature(sdkKey, sdkSecret, cleanNumber, role ?? 0);
  return NextResponse.json({ signature, sdkKey, demoMode: false });
}
