import { OrderImage } from '@types';
import ImageKit from 'imagekit';
import { NextRequest, NextResponse } from 'next/server';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!
});

export async function DELETE(req: NextRequest) {
  const images: OrderImage[] = await req.json();

  await Promise.all(
    images.map(async (img) => await imagekit.deleteFile(img.id))
  );

  return NextResponse.json({ message: 'Images deleted successfully' });
}
