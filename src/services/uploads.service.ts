import type { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';
import { AVATAR_FOLDER, AVATAR_SIZE } from '../config/uploads';
import { AppError, badRequest } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { toPublicUser } from '../serializers/users.serializer';

interface AvatarTransformation {
    width: number;
    height: number;
    crop: 'fill';
    gravity: 'face';
}

interface AvatarImageTransformation {
    quality: 'auto';
    fetch_format: 'auto';
}

interface AvatarUploadOptions {
    public_id: string;
    overwrite: boolean;
    invalidate: boolean;
    resource_type: 'image';
    transformation: [AvatarTransformation, AvatarImageTransformation];
}

const avatarPublicId = (userId: string): string => `${AVATAR_FOLDER}/${userId}`;

function uploadBuffer(buffer: Buffer, publicId: string): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve: (value: UploadApiResponse) => void, reject: (reason?: unknown) => void): void => {
        cloudinary.uploader
            .upload_stream(
                {
                    public_id: publicId,
                    overwrite: true,
                    invalidate: true,
                    resource_type: 'image',
                    transformation: [{ width: AVATAR_SIZE, height: AVATAR_SIZE, crop: 'fill', gravity: 'face' }, { quality: 'auto', fetch_format: 'auto' }],
                } satisfies AvatarUploadOptions,
                (err, result): void =>
                    err || !result
                        ? reject(new AppError(502, err?.message ?? 'Avatar upload failed'))
                        : resolve(result),
            )
            .end(buffer);
    });
}

export async function setAvatar(userId: string, file: Express.Multer.File | undefined): Promise<ReturnType<typeof toPublicUser>> {
    if (!file) throw badRequest('Attach an image in the "avatar" field');
    const result = await uploadBuffer(file.buffer, avatarPublicId(userId));
    const user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl: result.secure_url } });
    return toPublicUser(user);
}

export async function removeAvatar(userId: string): Promise<ReturnType<typeof toPublicUser>> {
    const user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl: null } });
    await cloudinary.uploader.destroy(avatarPublicId(userId), { invalidate: true });
    return toPublicUser(user);
}