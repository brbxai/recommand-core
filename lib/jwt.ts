import { jwtVerify, SignJWT, type JWTPayload } from "jose";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
}

const getKey = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not set");
    }
    return new TextEncoder().encode(process.env.JWT_SECRET);
};

export async function sign(payload: JWTPayload, expiresAt: Date) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(expiresAt)
        .sign(getKey());
}

export async function verify(session: string | Uint8Array) {
    try {
        const { payload } = await jwtVerify(session, getKey(), {
            algorithms: ["HS256"],
        });
        return payload;
    } catch (error) {
        return null;
    }
}