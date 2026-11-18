import { BadRequestException, Controller, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthUser } from '../../common/types';

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

@Controller('admin/upload')
export class UploadController {
  @Post()
  @Roles('STAFF')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: Number(process.env.UPLOAD_MAX_MB || 5) * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const ext = extname(file.originalname || '').toLowerCase();
        if (!ALLOWED.includes(ext)) {
          callback(new BadRequestException('仅支持 jpg/png/webp/gif 图片') as any, false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser, @Query('scope') scope?: string) {
    if (!file) throw new BadRequestException('请选择要上传的图片');

    const owner = user.type === 'platform' ? 'common' : user.tenantId || 'common';
    const now = new Date();
    const folder = join(
      'uploads',
      scope === 'brand' ? 'brand' : 'images',
      owner,
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`,
    );
    const dir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', folder.replace(/^uploads[\\/]/, ''));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const ext = extname(file.originalname || '.jpg').toLowerCase() || '.jpg';
    const filename = `${randomUUID()}${ext}`;
    writeFileSync(join(dir, filename), file.buffer);

    const url = `/${folder.replace(/\\/g, '/')}/${filename}`;
    const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
    return { url, absoluteUrl: base ? `${base}${url}` : url, size: file.size };
  }
}
