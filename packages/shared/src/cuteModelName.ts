const MODEL_EMOTICONS = [":3", "^w^", ";3", ">w<", "owo", "uwu", ":3c", "^-^"] as const;

/**
 * Suffix a model's display name with an emoticon chosen from its slug, so the
 * same model wears the same face in every picker, header and sidebar row.
 */
export function cuteModelName(name: string, slug: string): string {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  return `${name} ${MODEL_EMOTICONS[hash % MODEL_EMOTICONS.length]}`;
}
