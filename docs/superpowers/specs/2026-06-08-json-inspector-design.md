# JSON Inspector — Tasarım Dokümanı

**Tarih:** 2026-06-08
**Bileşen:** `components/craft/json-inspector.tsx`
**Tür:** rocket registry craft bileşeni (`registry:ui`)

## Amaç

Veri temalı craft set'inin ikinci parçası: katlanabilir, aranabilir, kod-editörü
tarzı bir **JSON inspector**. Tüketici herhangi bir JS değeri (veya JSON string)
verir; bileşen onu satır numaralı, tip renklendirmeli, katlanabilir bir ağaç olarak
render eder; anahtar/değer araması, eşleşme vurgulama ve düğüm bazında yol/değer
kopyalama sunar. [[query-builder]]'ın JSON çıktısını incelemek için de doğal eş.

Mevcut craft çıtası: `"use client"`, lucide ikonları, `motion/react` animasyonları,
`cn` + Tailwind, SSR-güvenli (no `Math.random`/`Date.now`). Self-contained tek dosya.

## Girdi işleme

`data: unknown`:
- String ise `JSON.parse` denenir. Başarısızsa **parse-hatası durumu** gösterilir:
  hata mesajı + ham metnin kendisi (salt-okunur). Ağaç render edilmez.
- Değilse (obje/dizi/primitive) doğrudan render edilir.
- `undefined`/fonksiyon gibi JSON-dışı değerler primitive olarak tip etiketiyle
  gösterilir (ağaç çökmeyecek; `typeOf` bunları sınıflandırır).

## Mimari — satırlara düzleştirme

İç içe div özyinelemesi yerine, parse edilen değer + katlanma durumu **görünür satır
dizisine** düzleştirilir. JSON pretty-print gibi her satır kendi numarasını alır:

- **Primitive satır:** `"email": "a@b.com"` (kök primitive ise anahtarsız).
- **Açık container:** açılış satırı `"users": [` + çocuk satırları + kapanış satırı
  `]`. Açılış/kapanış ayrı satırlardır (gerçek satır numaraları için şart).
- **Katlı container:** tek satır `"users": [ … ] 12 öğe` (çocuk/kapanış yok).
- Her satıra, son kardeş değilse görsel `,` eklenir (kod-editörü hissi).

Satır modeli:

```ts
type JsonKind =
  | "primitive"
  | "object-open"
  | "object-close"
  | "array-open"
  | "array-close";

interface JsonRow {
  /** Stable key, derived from path. */
  id: string;
  path: (string | number)[];
  depth: number;
  /** Object key or array index; undefined at root. */
  keyLabel?: string | number;
  kind: JsonKind;
  /** Primitive value (only for kind === "primitive"). */
  value?: unknown;
  /** Container size hint, e.g. 12 (only on *-open rows). */
  size?: number;
  /** Whether this container row is expandable. */
  expandable?: boolean;
  /** Whether this container is currently open. */
  open?: boolean;
  /** True if collapsed (renders inline `… N items` summary). */
  collapsedSummary?: boolean;
  /** Whether a trailing comma should be rendered. */
  trailingComma?: boolean;
}
```

## Katlanma durumu

Açık container yollarının `Set<string>`'i (path → `pathToString`). Başlangıçta
`defaultExpandedDepth`'e (varsayılan 1) kadar olan tüm container yolları açık. Bir
satırın ▸/▾ kontrolü yolu set'e ekler/çıkarır. Üst bardaki **hepsini aç** tüm
container yollarını ekler; **hepsini kapa** set'i boşaltır (kök hariç tutulabilir).

## Arama + vurgulama

Üst bardaki input (`searchable`, varsayılan true):
- Sorgu (case-insensitive) anahtar etiketinde VEYA primitive değerin string
  halinde eşleşen düğümleri bulur.
- Eşleşen her düğümün tüm ataları açılmaya zorlanır; eşleşmeye giden yolda olmayan
  dallar gizlenir. Yani yalnızca eşleşmeler + onlara giden yollar görünür.
- Eşleşen metin parçası `<mark>` ile vurgulanır.
- Sorgu boşsa normal ağaç; kullanıcının katlanma durumu korunur.
- Üst bar eşleşme sayısını gösterir (ör. "3 eşleşme"), 0 ise nazik boş durum.

Düzleştirme bu yüzden iki moda göre çalışır: normal (katlanma set'i) ve arama
(eşleşme-yolu set'i). `flatten(value, openPaths, query)` tek fonksiyon; `query`
verildiğinde eşleşme-yolu hesabını yapıp görünürlüğü ona göre belirler.

## Kopyalama

Her satırda (hover'da beliren) iki eylem:
- **Yolu kopyala** → JSON path string'i, ör. `data.users[0].email`. Kök etiketi
  `rootName` prop'u (verilmezse `root`). Geçerli identifier olmayan anahtarlar
  `["weird key"]` biçiminde köşeli parantezle yazılır.
- **Değeri kopyala** → düğümün alt ağacının `JSON.stringify(value, null, 2)`'si;
  primitive ise ham string değeri.

Transient ✓ geri bildirimi için [[query-builder]]'daki `useCopy` deseni bu dosyada
yeniden uygulanır (craft self-contained kalsın).

## Görsel (kod-editörü tarzı)

- **Sol gutter:** soluk, sağa yaslı satır numaraları (`showLineNumbers`, varsayılan
  true). Monospace.
- **Tip renkleri** (semantik, sabit): string yeşil, number turuncu, boolean mavi,
  `null`/`undefined` soluk italik, anahtarlar `foreground`, bracket/virgül `muted`.
- **Boyut rozetleri:** `3 anahtar` / `12 öğe` küçük `muted` etiket (açık veya katlı
  container satırında).
- Girinti `depth`'e göre; tüm gövde monospace; satır ekle/çıkar `motion`
  `AnimatePresence` ile yumuşak.

## Bileşen API'si

```ts
interface JsonInspectorProps {
  data: unknown;                 // değer veya JSON string
  defaultExpandedDepth?: number; // varsayılan 1
  searchable?: boolean;          // varsayılan true
  showLineNumbers?: boolean;     // varsayılan true
  rootName?: string;             // JSON path kökü, varsayılan "root"
  className?: string;
}
```

Saf yardımcılar: `parseInput(data)`, `typeOf(value)`, `pathToString(path, rootName)`,
`flatten(value, openPaths, query, ...)`.

## Registry kaydı

```jsonc
{
  "name": "json-inspector",
  "type": "registry:ui",
  "title": "JSON Inspector",
  "description": "A collapsible, searchable, code-editor-style JSON tree viewer with type coloring, line numbers, match highlighting and per-node path/value copy.",
  "dependencies": ["lucide-react", "motion"],
  "registryDependencies": ["input"],
  "files": [{ "path": "components/craft/json-inspector.tsx", "type": "registry:ui" }]
}
```

`registryDependencies` implementasyonda fiilen kullanılan primitiflere göre
kesinleşir (üst bar butonları çıplak `<button>` olabilir; arama `input` kullanır).
Craft bileşeni primitifleri `@/components/ui/*`, yardımcıları `@/lib/*` üzerinden
import eder (AGENTS.md kuralı).

## Showcase + site

- `lib/showcase.tsx`: `JsonInspector` import, gerçekçi iç içe demo verisi (kullanıcı +
  siparişler + nested adres/array), ve `showcaseEntries` girdisi.
- `lib/site.ts`: `keywords`'e `"json inspector"`.

## Doğrulama

- `pnpm exec tsc --noEmit` + biome temiz.
- `pnpm registry:build` → `public/r/json-inspector.json` üretir.
- dev server + Playwright: render + satır numaraları, düğüm aç/kapa, hepsini aç/kapa,
  arama (vurgu + eşleşmeyen dalların gizlenmesi + sayaç), yol kopyalama (doğru JSON
  path), değer kopyalama, ve **parse-hatası durumu** (bileşene bozuk JSON string
  verilen ayrı bir demo veya doğrudan kontrol).

## Kapsam dışı (YAGNI)

- Düzenleme (salt-okunur inspector; değer değiştirme yok).
- Sanallaştırma/virtualization (çok büyük JSON için pencereleme) — ilk sürümde değil.
- Tip-bazlı özel render (tarih algılama, URL'leri link yapma) — düz string.
- Dışa aktarma/indirme; tema dışı renk konfigürasyonu.
- Diff/karşılaştırma (ayrı bileşen: diff viewer).
```
