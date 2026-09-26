import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    
    // MEJORA 1 (Seguridad): Usamos path.basename para prevenir ataques de "Path Traversal"
    // Esto asegura que el input "foo/../bar.jpg" se convierta siempre en "bar.jpg"
    const rawFilename = resolvedParams.filename as string;
    const filename = path.basename(rawFilename);

    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 });
    }

    // Ruta a las imágenes normalizadas
    const dataDir = path.join(process.cwd(), '..', 'data', 'images_normalized');
    let filePath = path.join(dataDir, filename);

    if (!fs.existsSync(filePath)) {
      // La base de datos puede pedir .png o .gif, pero el normalizador las convirtió a .jpg
      const parsedPath = path.parse(filename);
      const fallbackPath = path.join(dataDir, `${parsedPath.name}.jpg`);
      
      if (fs.existsSync(fallbackPath)) {
        filePath = fallbackPath;
      } else {
        return new NextResponse('Image not found', { status: 404 });
      }
    }

    // MEJORA 2 (MIME Types): Añadimos soporte ampliado para más formatos
    let contentType = 'image/jpeg';
    const lowerName = filename.toLowerCase();
    if (lowerName.endsWith('.png')) contentType = 'image/png';
    else if (lowerName.endsWith('.webp')) contentType = 'image/webp';
    else if (lowerName.endsWith('.gif')) contentType = 'image/gif';
    else if (lowerName.endsWith('.svg')) contentType = 'image/svg+xml';

    // MEJORA 3 (Rendimiento): Usamos un Stream de lectura para no saturar la memoria RAM
    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);
    
    // Adaptamos el stream nativo de Node.js al ReadableStream web de Next.js
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk: Buffer | string) => controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(), // Ayuda al cliente a conocer el peso total
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
