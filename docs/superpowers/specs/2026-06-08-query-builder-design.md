# Query Builder — Tasarım Dokümanı

**Tarih:** 2026-06-08
**Bileşen:** `components/craft/query-builder.tsx`
**Tür:** rocket registry craft bileşeni (`registry:ui`)

## Amaç

Veri temalı, ayırt edici bir craft bileşeni: görsel, iç içe **AND/OR** sorgu
kurucu. Tüketici tipli bir **alan şeması** verir; bileşen bir sorgu ağacı yönetir,
`onChange` ile dışarı verir ve sorgunun **salt-okunur** SQL/JSON canlı önizlemesini
gösterir. Sorgunun düzenlenmesi yalnızca görsel kurucudan yapılır; önizleme tek
yönlü bir yansımadır.

Mevcut craft üçlüsüyle (`timeline`, `activity-feed`, `comment-thread`) aynı çıtada:
`"use client"`, lucide ikonları, `motion/react` animasyonları, `useMounted` ile
SSR-güvenli render, immutable ağaç işlemleri (`mapTree` deseni), `cn` + Tailwind.

## Çekirdek veri modeli

```ts
type FieldType = "text" | "number" | "select" | "boolean" | "date";

interface QueryField {
  name: string;            // "status"
  label?: string;          // "Status" (yoksa name kullanılır)
  type: FieldType;
  options?: { label: string; value: string }[]; // select için
}

interface QueryRule {
  id: string;
  field: string;           // QueryField.name'e referans
  operator: string;        // tipe göre operatör anahtarı
  value: unknown;
}

interface QueryGroup {
  id: string;
  combinator: "and" | "or";
  rules: (QueryRule | QueryGroup)[];   // özyinelemeli → iç içe gruplar
}
```

`QueryRule` ile `QueryGroup` ayrımı `"combinator" in node` (ya da `"rules" in node`)
ile yapılır.

## Operatör haritası (tipe göre)

Dahili, sabit bir harita. Operatör anahtarları SQL'e derlenirken sembollere çevrilir.

| Tip       | Operatörler (anahtar → etiket / SQL)                                   |
|-----------|------------------------------------------------------------------------|
| `text`    | `eq` (=), `neq` (≠), `contains` (LIKE %…%), `startsWith`, `endsWith`    |
| `number`  | `eq` (=), `neq` (≠), `gt` (>), `gte` (≥), `lt` (<), `lte` (≤), `between`|
| `date`    | `eq`, `before` (<), `after` (>), `between`                             |
| `select`  | `in` (IN), `notIn` (NOT IN), `eq`, `neq`                               |
| `boolean` | `is` (= true/false)                                                    |

`between` iki değerli; `in`/`notIn` çoklu değerli; geri kalan tek değerli.
Alan değiştirildiğinde operatör o tipin ilk geçerli operatörüne, değer de tipin
boş varsayılanına sıfırlanır.

## Bileşen API'si

```ts
interface QueryBuilderProps {
  fields: QueryField[];
  value?: QueryGroup;          // controlled
  defaultValue?: QueryGroup;   // uncontrolled
  onChange?: (group: QueryGroup) => void;
  maxDepth?: number;           // varsayılan 3 (kök = 0)
  className?: string;
}
```

Hem controlled hem uncontrolled desteklenir (shadcn primitifleri gibi). `value`
verilmişse controlled; aksi halde dahili state `defaultValue`'dan başlar. Her iki
modda da değişiklikler `onChange` ile bildirilir.

ID üretimi SSR-güvenli: `Math.random`/`Date.now` kullanılmaz (craft konvansiyonu).
Artan bir sayaç ref'i veya `useId` tabanlı şema ile id verilir.

## Etkileşimler

Tüm güncellemeler immutable; ağaçta düğüm bulup dönüştürmek için `comment-thread`'in
`mapTree` desenine paralel `updateNode` / `removeNode` / `addToGroup` yardımcıları.

- **Kural ekle** ve **alt grup ekle** — her grup başlığındaki butonlar
  (`maxDepth`'e ulaşılmışsa "alt grup ekle" gizlenir/pasifleşir).
- **Kural satırı:** alan seçici (`select`) → operatör seçici (`select`) → değere
  göre değişen giriş:
  - `text` → `input`
  - `number` → `input[type=number]` (between → iki input)
  - `select` → tek/çoklu değer seçimi
  - `boolean` → true/false toggle
  - `date` → tarih input (between → iki input)
- **Sil:** her kural ve her grup (kök hariç) için ✕.
- **AND/OR toggle:** grup başlığındaki pill ile combinator değişir.
- **Boş grup:** ince placeholder ("Koşul ekle").
- **Animasyon:** ekleme/silmede `AnimatePresence` ile yumuşak giriş-çıkış
  (activity-feed/comment-thread tarzı).

## Görsel yapı (Yerleşim A — sol ray + bağlantı)

- Her grubun solunda dikey ray + üstte AND/OR pill.
- Renkler **semantik ve sabit:** AND = mavi `#3b82f6`, OR = mor `#a855f7`
  (ray, pill ve bağlantı çizgisi o grubun combinator'ına göre tonlanır).
- İç içe gruplar içeri kayar; ray rengi her grubun kendi combinator'ını yansıtır.
- Kurallar rayın sağında hafif tonlu satır kartları (token tabanlı nötr arka plan).
- Bağlantı çizgisi `timeline` bileşenindeki gibi sürekli; aynı `cn` + Tailwind
  yaklaşımı. Yapısal renkler tema tokenlarından, AND/OR vurgu renkleri sabit.

## Canlı önizleme (salt-okunur)

Kurucunun altında, akış içinde (sticky değil). İki sekme (`tabs`):

- **SQL:** `(status = 'active' AND age > 18) OR plan IN ('pro', 'team')` —
  derlenmiş, salt-okunur, **kopyala** butonu (showcase'deki install-command
  kopyalama desenine tutarlı).
- **JSON:** girintili `QueryGroup` ağacı, kopyala butonu.
- Boş sorgu: "Henüz koşul yok" nazik durumu.

Derleyiciler saf yardımcılar:
- `toSQL(group, fields): string` — operatörleri sembollere/anahtar kelimelere
  çevirir; string değerleri tek tırnakla sarar ve içteki tek tırnağı escape eder
  (`'` → `''`). Çıktı **görsel/kopyalama amaçlı**; gerçek bir veritabanına
  güvenli gönderim tüketicinin sorumluluğundadır (registry açıklamasında belirtilir).
- JSON için `JSON.stringify(group, null, 2)`.

Önizlemenin düzenlemeye etkisi yoktur (tek yön: ağaç → önizleme).

## Registry kaydı

`registry.json`'a yeni item:

```jsonc
{
  "name": "query-builder",
  "type": "registry:ui",
  "title": "Query Builder",
  "description": "Görsel, iç içe AND/OR sorgu kurucu; tipli alan şeması, salt-okunur SQL/JSON canlı önizleme ve kopyalama ile.",
  "files": [{ "path": "components/craft/query-builder.tsx", "type": "registry:ui" }],
  "registryDependencies": ["button", "select", "input", "tabs"]
}
```

`registryDependencies` implementasyonda fiilen kullanılan shadcn primitiflerine göre
kesinleştirilir (popover gerekirse eklenir). Craft bileşeni primitifleri
`@/components/ui/*`, yardımcıları `@/lib/*` üzerinden import eder (AGENTS.md kuralı).

## Doğrulama

- Showcase/demo sayfasına örnek bir instance eklenir (gerçekçi `fields` ile).
- Elle (gerekirse Playwright ile) doğrulanır: AND/OR toggle, kural/alt grup
  ekleme-silme, iç içe gruplar, `maxDepth` sınırı, tipe göre değer girişleri ve
  SQL/JSON önizleme derlemesi + kopyalama.
- Saf derleyici için birim testleri: `toSQL` çeşitli ağaçlarda doğru string üretir;
  string escape ve `between`/`in` çoklu değer kenar durumları.

## Kapsam dışı (YAGNI)

- Önizlemeden düzenleme (tek yön).
- Doğal dil önizlemesi / i18n çeviri katmanı.
- Gerçek veri filtreleme/sonuç tablosu.
- Sürükle-bırak ile düğüm taşıma.
- Mongo/diğer hedef diller (sadece SQL + JSON).
