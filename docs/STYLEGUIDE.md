# Style Guide — Poddspelare

Design-token-baserad stilguide, avsedd att klistras in som kontext till Cline innan implementation påbörjas. Stack: Next.js (frontend) + Spring Boot (backend), Tailwind 4, headless komponenter.

---

## 1. Koncept

Zornpaletten är en historisk, hårt begränsad målarpalett (Anders Zorn) med bara fyra pigment. Överfört till UI blir det en design som känns disciplinerad och grafisk snarare än "appig": få färger, hårda kanter, linjer istället för skuggor. Målet är att paletten och formspråket ska kännas som ett *val*, inte som Tailwinds default-look.

Formspråket har två register som ska hållas isär tydligt:
- **Skarpt** (default): `border-radius: 0` på i princip allt — knappar, paneler, kort, inputs.
- **Runt** (undantag, sparsamt): enstaka helt cirkulära element (t.ex. play-knappen, en avatar, en progress-dot) för att skapa kontrast mot allt skarpt. Aldrig "lite rundat" (4px, 8px etc.) — antingen 0 eller en perfekt cirkel, inget mittemellan.

---

## 2. Färgpalett (ljust läge)

| Namn | Roll | Hex | Användning |
|---|---|---|---|
| Blyvitt | Bakgrund / yta | `#F1EAD9` | Sidbakgrund, kortytor |
| Elfenbensvart | Text / linjer | `#211D1A` | Brödtext, borders, ikoner |
| Gulockra | Accent (primär) | `#C69328` | Aktiva states, highlights, progress-fill |
| Cinnober | Accent (varning/CTA) | `#C1440E` | Play/CTA-knappar, felmeddelanden, "live"-indikator |

Regler:
- Blyvitt och Elfenbensvart är arbetshästarna (bakgrund/text). Gulockra och Cinnober används sparsamt, som accent — aldrig som stor ytfärg.
- Ingen femte färg läggs till. Om en ny semantisk färg "behövs" (t.ex. success/error), lös det med opacitet eller mönster (t.ex. streckad border) på de fyra existerande, inte med en ny hex.
- Kontrast: Elfenbensvart på Blyvitt ⇒ mycket hög kontrast (AAA). Cinnober/Gulockra används aldrig som textfärg på Blyvitt för längre text — bara för korta labels, ikoner, fyllda knappar med vit/svart text ovanpå.

## 3. Mörkt läge (roterat, inte "dimmat")

Mörkt läge är en riktig rotation av paletten, inte bara en mörkare gråton:

| Roll | Ljust läge | Mörkt läge |
|---|---|---|
| Bakgrund | Blyvitt `#F1EAD9` | Elfenbensvart `#1A1714` |
| Text / linjer | Elfenbensvart `#211D1A` | Blyvitt `#F1EAD9` |
| Accent primär | Gulockra `#C69328` | Gulockra `#D9A83E` (ljusare, för kontrast mot mörk bakgrund) |
| Accent CTA | Cinnober `#C1440E` | Cinnober `#E0602A` (ljusare) |

Elfenbensvart i mörkt läge ska vara *svalt* (lätt blåaktigt/kallt svart), inte neutralt grått — det är det som gör att det känns som samma palett roterad, inte en annan design.

## 4. Typografi

- En display-typsnitt för rubriker/branding, ett för brödtext — max två familjer, tydligt olika karaktär (t.ex. en stram serif för rubriker + en neutral sans för UI/brödtext). Undvik systemfontens default-känsla; välj aktivt.
- Ingen ALL CAPS på labels. Ingen enstaka kursiverad/bold ord-highlight i rubriker.
- Radlängd < 80 tecken i brödtext (t.ex. avsnittsbeskrivningar).
- Siffror (tidsstämplar, uppspelningstid) sätts med tabular figures om typsnittet stödjer det, så att progress-siffror inte "hoppar" i bredd.

## 5. Form & kant

- `border-radius: 0` som global default på Button, Card, Input, Modal, Panel.
- Undantag — helt cirkulära element (`border-radius: 9999px` / `50%`), använd medvetet på max 1–2 element per vy:
  - Play/pause-knappen i mini-player och full player.
  - Avatar/podcast-cover-thumbnail i listor (kan även vara skarp — välj ett och håll det konsekvent).
  - Progress-handtag (draggable dot) på scrubber-linjen.
- Inget mittemellan (inga 4px/8px/12px-rundningar någonstans).

## 6. Djup & separation — linjer, inte skuggor

- Ingen `box-shadow` för separation eller "lyft". Ingen gradient.
- Djup/hierarki skapas med:
  - `border: 1px solid` (Elfenbensvart/Blyvitt beroende på läge) mellan sektioner, runt kort, under listrader.
  - Vid behov av starkare separation: tjockare border (2px) eller dubbel linje, inte mer opacitet/blur.
- Fokusindikator (tangentbordsfokus) = tjock solid outline i Cinnober eller Gulockra, aldrig en mjuk glow.

## 7. Komponentarkitektur

- Basera UI-primitiver på headless-bibliotek utan egen styling — Radix UI *eller* Headless UI (välj ett, blanda inte). Radix UI Primitives rekommenderas i första hand givet bredare komponenttäckning (Slider/Dialog/Tabs behövs för en podd-player).
- All visuell styling (färg, kant, spacing, typsnitt) definieras **centralt** som design tokens — aldrig hårdkodat i enskilda komponenter — så att en framtida andra "skin"/färgprofil kan bytas in utan att röra komponentlogiken.
- Tailwind 4: definiera paletten som CSS-variabler i `@theme`, inte som ad-hoc-klasser i JSX.

### Exempel — token-lager (Tailwind 4 `@theme` + CSS-variabler)

```css
/* app/globals.css */
@theme {
  --color-bg: var(--zorn-bg);
  --color-fg: var(--zorn-fg);
  --color-accent: var(--zorn-accent);
  --color-cta: var(--zorn-cta);
  --radius-base: 0px;
}

:root {
  --zorn-bg: #F1EAD9;      /* Blyvitt */
  --zorn-fg: #211D1A;      /* Elfenbensvart */
  --zorn-accent: #C69328;  /* Gulockra */
  --zorn-cta: #C1440E;     /* Cinnober */
}

[data-theme="dark"] {
  --zorn-bg: #1A1714;
  --zorn-fg: #F1EAD9;
  --zorn-accent: #D9A83E;
  --zorn-cta: #E0602A;
}
```

Komponenter refererar sedan enbart till `bg-bg`, `text-fg`, `border-fg`, `bg-accent` osv — aldrig till specifika hex eller till "gulockra" direkt i komponentkod. Det gör att ett helt nytt färgtema (t.ex. en annan historisk palett) senare bara kräver ett nytt `[data-theme="..."]`-block, inte omskrivning av komponenter.

## 8. Sammanfattande principer (att ge Cline som kontext)

1. Fyra färger, ingen mer. Två är yta/text, två är sparsam accent.
2. Mörkt läge = rotation av paletten (kall bakgrund/varm text blir kall text/varm... osv.), inte en gråskale-dimmer.
3. `border-radius: 0` överallt, med undantag av enstaka fullt cirkulära element för kontrast.
4. Separation/djup = borders, aldrig skuggor eller gradienter.
5. Headless primitives (Radix UI) + Tailwind 4, all styling via centrala tokens/CSS-variabler — ingen hårdkodad färg i komponentkod.