import type { Session } from '../../generated/prisma/client';

export const describeUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown device';
    if (/okhttp|Expo|ReactNative|LolaPayMobile/i.test(ua)) return 'LolaPay Mobile';
    if (/Postman/i.test(ua)) return 'Postman';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    return [browser, os].filter(Boolean).join(' on ');
};

export const toSession = (s: Session, currentSessionId: string) => ({
    id: s.id,
    device: describeUserAgent(s.userAgent),
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    expiresAt: s.expiresAt,
    isCurrent: s.id === currentSessionId,
});
