import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { refuseUnlessOwner } from "@/lib/auth";

/**
 * Hands the owner's browser a short-lived token to put one picture straight into the Blob store.
 * The picture is already shrunk to WebP in the browser; the gallery row is written afterwards by addPicture.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const reply = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const denied = await refuseUnlessOwner();
        if (denied) throw new Error(denied.reason);
        if (!pathname.startsWith("galleria/")) throw new Error("Pictures go in the gallery folder.");
        return { allowedContentTypes: ["image/webp", "image/jpeg"], maximumSizeInBytes: 6 * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return Response.json(reply);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The picture could not be hung." }, { status: 400 });
  }
}
