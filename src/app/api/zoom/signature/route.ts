import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function generateZoomSignature(
  sdkKey: string,
  sdkSecret: string,
  meetingNumber: string,
  role: number
): string {
  const timestamp = new Date().getTime() - 30000;
  const msg = Buffer.from(`${sdkKey}${meetingNumber}${timestamp}${role}`).toString('base64');
  const hash = crypto.createHmac('sha256', sdkSecret).update(msg).digest('base64');
  const signature = Buffer.from(`${sdkKey}.${meetingNumber}.${timestamp}.${role}.${hash}`).toString('base64');
  return signature;
}

export async function POST(req: NextRequest) {
  const { meetingNumber, role } = await req.json();

  const sdkKey = process.env.ZOOM_SDK_KEY || 'demo_sdk_key';
  const sdkSecret = process.env.ZOOM_SDK_SECRET || 'demo_sdk_secret';

  if (sdkKey === 'demo_sdk_key') {
    return NextResponse.json({
      signature: '',
      sdkKey: '',
      demoMode: true,
      message: 'Zoom SDK credentials not configured. Set ZOOM_SDK_KEY and ZOOM_SDK_SECRET in .env.local',
    });
  }

  const signature = generateZoomSignature(sdkKey, sdkSecret, meetingNumber, role);
  return NextResponse.json({ signature, sdkKey, demoMode: false });
}
