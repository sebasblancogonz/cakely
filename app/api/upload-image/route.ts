// app/api/upload/route.ts
import ImageKit from 'imagekit';
import { NextRequest, NextResponse } from 'next/server';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!
});

export async function POST(req: NextRequest) {
  console.log('from the backend');
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];

  const uploadPromises = files.map(async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await imagekit.upload({
      file: buffer,
      fileName: file.name,
      folder: 'aurabakery', // carpeta opcional
      useUniqueFileName: true
    });
  });

  const uploadedFiles = await Promise.all(uploadPromises);
  return NextResponse.json({ uploaded: uploadedFiles });
}
