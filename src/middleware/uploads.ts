import type { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from '../config/uploads';
import { badRequest } from '../lib/errors';

interface AvatarRequest extends Request {
    file?: Express.Multer.File;
}

interface AvatarUploadFile extends Express.Multer.File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
    destination?: string;
    filename?: string;
    path?: string;
}

function avatarFileFilter(_req: AvatarRequest, file: AvatarUploadFile, cb: FileFilterCallback): void {
    if ((AVATAR_MIME_TYPES as readonly string[]).includes(file.mimetype)) return cb(null, true);
    cb(badRequest(`Only ${AVATAR_MIME_TYPES.map((m: string) => m.split('/')[1]).join(', ')} images are allowed`), false);
}

const avatarStorage = multer.memoryStorage();

export const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
    fileFilter: avatarFileFilter,
}).single('avatar');