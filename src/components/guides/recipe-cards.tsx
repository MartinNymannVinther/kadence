import { useTranslations } from "next-intl";
import { RECIPES } from "@/modules/guides/guides";

/**
 * The food guide's four recipes with grams, carbohydrate and price per
 * portion (docs/research/ernaering.md, section 2), set inside the
 * "Hjemmelavet energi" section.
 */
export function RecipeCards() {
  const t = useTranslations("guides.food.recipes");
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {RECIPES.map((recipe) => {
        const key = (k: string) => t(`items.${recipe.id}.${k}` as "method");
        return (
          <article
            key={recipe.id}
            className="border-border bg-background flex flex-col gap-2 rounded-lg border p-3"
          >
            <h3 className="text-reading font-semibold">{key("title")}</h3>
            <div>
              <p className="text-label text-xs font-medium">{t("ingredients")}</p>
              <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5 text-2sm marker:text-meta">
                {Array.from({ length: recipe.ingredients }, (_, i) => (
                  <li key={i}>{key(`ingredients.${i + 1}`)}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-label text-xs font-medium">{t("method")}</p>
              <p className="mt-1 text-2sm leading-relaxed">{key("method")}</p>
            </div>
            <p className="text-2sm leading-relaxed font-medium">{key("carbs")}</p>
            <p className="text-meta text-2sm leading-relaxed">{key("price")}</p>
          </article>
        );
      })}
    </div>
  );
}
