import { supabase } from "@/lib/supabaseClient";

export async function uploadVideoBlob(
  blob: Blob,
  mockIdRef: string,
  answerId: number
): Promise<string | null> {
  try {
    const path = `${mockIdRef}/${answerId}.webm`;
    const { error } = await supabase.storage
      .from("interview-videos")
      .upload(path, blob, {
        contentType: blob.type || "video/webm",
        upsert: true,
      });

    if (error) {
      console.error("Video upload failed:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("interview-videos")
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (err) {
    console.error("Video upload error:", err);
    return null;
  }
}
