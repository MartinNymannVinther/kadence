"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { createThreadAction } from "@/modules/community/actions";
import { CATEGORIES, type Category } from "@/modules/community/categories";

/**
 * A new thread in Trænerrummet, signed with the active club. A session
 * from the club's library may come along as a copy — its structure, never
 * a rider's data. The line under the field says what belongs here.
 */
export function NewThread({ templates }: { templates: Array<{ id: string; name: string }> }) {
  const t = useTranslations("community.compose");
  const categories = useTranslations("community.category");
  const router = useRouter();
  const { run, pending } = useRun();
  const [category, setCategory] = useState<Category>("training");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");

  return (
    <form
      className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface"
      onSubmit={async (e) => {
        e.preventDefault();
        const created = await run(
          () => createThreadAction({ category, title, body, templateId: templateId || null }),
          { success: t("posted"), refresh: false },
        );
        if (created) router.push(`/coaches/${created.id}`);
      }}
    >
      <h2 className="text-base font-semibold">{t("title")}</h2>
      <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <NativeSelect
          aria-label={t("category")}
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categories(c)}
            </option>
          ))}
        </NativeSelect>
        <Input
          aria-label={t("subject")}
          placeholder={t("subject")}
          value={title}
          maxLength={160}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <Textarea
        aria-label={t("body")}
        placeholder={t("bodyHint")}
        rows={5}
        value={body}
        maxLength={8000}
        onChange={(e) => setBody(e.target.value)}
      />
      <p className="text-meta text-xs">{t("rule")}</p>
      <div className="flex flex-wrap items-center gap-2">
        {templates.length > 0 && (
          <NativeSelect
            aria-label={t("attach")}
            variant="sm"
            className="max-w-72"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">{t("attach")}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <Button type="submit" disabled={pending || !title.trim() || !body.trim()}>
          <Send data-icon="inline-start" />
          {t("post")}
        </Button>
      </div>
    </form>
  );
}
