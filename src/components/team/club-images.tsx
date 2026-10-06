"use client";

import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { IMAGE_KINDS, IMAGE_LIMITS, type ImageKind } from "@/modules/team/image-format";
import { scaleImage } from "./scale-image";

const ERRORS = new Set(["format", "tooLarge", "dimensions", "forbidden"]);

/**
 * The club's logo and picture under Settings → Workspace (ADR 0048). A
 * coach chooses a file; the browser scales it and sends it; the page
 * shows the new one. Everyone else sees what the club has, without the
 * buttons.
 */
export function ClubImages({
  images,
  canEdit,
}: {
  images: Record<ImageKind, string | null>;
  canEdit: boolean;
}) {
  const t = useTranslations("settings.workspace.images");
  const router = useRouter();
  const [busy, setBusy] = useState<ImageKind | null>(null);
  const inputs = useRef<Partial<Record<ImageKind, HTMLInputElement | null>>>({});

  async function upload(kind: ImageKind, file: File) {
    setBusy(kind);
    try {
      const limit = IMAGE_LIMITS[kind];
      const blob = await scaleImage(file, {
        side: limit.side,
        maxBytes: limit.bytes,
        transparent: kind === "logo",
      });
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", blob, `${kind}.img`);
      const response = await fetch("/api/org/image", { method: "POST", body: form });
      if (!response.ok) {
        const { error } = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(t(`errors.${error && ERRORS.has(error) ? error : "generic"}` as "title"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    } catch (error) {
      toast.error(
        t(
          error instanceof Error && error.message === "tooLarge"
            ? "errors.tooLarge"
            : "errors.format",
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove(kind: ImageKind) {
    setBusy(kind);
    const response = await fetch(`/api/org/image/${kind}`, { method: "DELETE" });
    setBusy(null);
    if (!response.ok) {
      toast.error(t("errors.generic"));
      return;
    }
    toast.success(t("removed"));
    router.refresh();
  }

  return (
    <section className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-surface">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{t("title")}</h3>
        <p className="text-meta text-2sm leading-relaxed">{t("body")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {IMAGE_KINDS.map((kind) => (
          <div key={kind} className="flex flex-col gap-2">
            <p className="text-label text-xs font-medium">{t(kind)}</p>
            <div className="border-border bg-secondary flex h-28 items-center justify-center overflow-hidden rounded-lg border">
              {images[kind] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[kind]!}
                  alt=""
                  className={
                    kind === "logo"
                      ? "max-h-24 max-w-24 object-contain"
                      : "h-full w-full object-cover"
                  }
                />
              ) : (
                <span className="text-meta text-2sm">{t("none")}</span>
              )}
            </div>
            <p className="text-meta text-xs">{t(`${kind}Hint`)}</p>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <input
                  ref={(el) => {
                    inputs.current[kind] = el;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-label={t(kind)}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void upload(kind, file);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => inputs.current[kind]?.click()}
                >
                  {busy === kind ? <Loader2 className="animate-spin" /> : <ImageUp />}
                  {busy === kind ? t("uploading") : images[kind] ? t("replace") : t("choose")}
                </Button>
                {images[kind] && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => void remove(kind)}
                  >
                    <Trash2 />
                    {t("remove")}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
