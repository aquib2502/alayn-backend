import fs from 'fs';
import path from 'path';

export const saveBase64Image = (base64String: string | undefined, folderName: string): string | null => {
  if (!base64String || !base64String.startsWith('data:image/')) {
    console.log('[saveBase64Image] Missing or invalid prefix');
    return null;
  }

  try {
    const parts = base64String.split(';base64,');
    if (parts.length !== 2) {
      console.log('[saveBase64Image] Split failed');
      return null;
    }

    const typePart = parts[0]; // e.g., 'data:image/jpeg'
    const type = typePart.replace('data:', ''); // 'image/jpeg'
    const base64Data = parts[1];
    
    let extension = type.split('/')[1] || 'png';
    if (extension === 'jpeg') extension = 'jpg';

    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    
    const data = Buffer.from(base64Data, 'base64');

    // Use __dirname to guarantee resolution relative to alayn-backend directory
    const uploadDir = path.resolve(__dirname, '../../uploads', folderName);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, data);
    console.log('[saveBase64Image] Saved image successfully to:', filePath);

    return `/uploads/${folderName}/${fileName}`;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    return null;
  }
};
